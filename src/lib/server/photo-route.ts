import { MAX_IMAGE_BYTES, analyzeLabel, sniffImageType, type ScanMode } from "@/lib/server/label";
import { NextResponse } from "next/server";
import { jsonError, sameOrigin } from "@/lib/server/http";
import { clientIp, dailyBudgetOk, intFromEnv, rateLimit } from "@/lib/server/rate-limit";

/**
 * Traitement commun des routes photo (/api/label et /api/plate). Seul intermédiaire vers l'API Claude. L'image :
 *  - n'est ni écrite sur disque, ni journalisée, ni mise en cache ;
 *  - vit uniquement en mémoire le temps de la requête.
 * Chaque mode a son propre quota par IP et son propre plafond quotidien.
 */
export async function handlePhotoRequest(req: Request, mode: ScanMode): Promise<Response> {
  if (!sameOrigin(req)) return jsonError(403, "forbidden");

  const ip = clientIp(req.headers);
  const prefix = mode === "plate" ? "PLATE" : "LABEL";
  const rl = rateLimit(`${mode}:${ip}`, intFromEnv(`${prefix}_RATE_LIMIT_PER_10MIN`, 5), 10 * 60_000);
  if (!rl.ok) return jsonError(429, "rate_limited", { "Retry-After": String(rl.retryAfterSec) });

  // Validation AVANT de lire le corps : type déclaré et taille annoncée.
  const ctype = (req.headers.get("content-type") ?? "").split(";")[0]!.trim();
  if (!["image/jpeg", "image/png", "image/webp"].includes(ctype)) return jsonError(415, "invalid_image");
  const declared = Number(req.headers.get("content-length") ?? "0");
  if (!Number.isFinite(declared) || declared <= 0 || declared > MAX_IMAGE_BYTES) return jsonError(413, "invalid_image");

  let bytes: Uint8Array;
  try {
    bytes = await readLimited(req, MAX_IMAGE_BYTES);
  } catch {
    return jsonError(413, "invalid_image");
  }
  // Le type RÉEL (magic bytes) doit correspondre au type déclaré.
  const real = sniffImageType(bytes);
  if (!real || real !== ctype) return jsonError(415, "invalid_image");

  if (!dailyBudgetOk(intFromEnv(`${prefix}_DAILY_BUDGET`, 500), mode)) return jsonError(503, "unavailable");

  const out = await analyzeLabel(bytes, real, mode);
  bytes = new Uint8Array(0); // libère la référence : rien n'est conservé

  if (out.kind === "unreadable") return jsonError(422, "unreadable");
  if (out.kind === "unavailable") return jsonError(503, "unavailable");
  if (out.kind === "error") return jsonError(502, "analysis_failed");
  return NextResponse.json({ product: out.product }, { headers: { "Cache-Control": "no-store" } });
}

/** Lit le corps en s'arrêtant dès que la limite est dépassée (Content-Length peut mentir). */
async function readLimited(req: Request, max: number): Promise<Uint8Array> {
  const reader = req.body?.getReader();
  if (!reader) throw new Error("no body");
  const chunks: Uint8Array[] = [];
  let total = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    total += value.byteLength;
    if (total > max) {
      await reader.cancel();
      throw new Error("too large");
    }
    chunks.push(value);
  }
  const out = new Uint8Array(total);
  let off = 0;
  for (const c of chunks) {
    out.set(c, off);
    off += c.byteLength;
  }
  return out;
}
