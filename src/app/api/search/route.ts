import { NextResponse } from "next/server";
import { normalizeQuery } from "@/lib/search-input";
import { searchProducts } from "@/lib/server/off";
import { jsonError, sameOrigin } from "@/lib/server/http";
import { clientIp, intFromEnv, rateLimit } from "@/lib/server/rate-limit";

export const runtime = "nodejs";

/**
 * POST /api/search  { "q": "biscuit chocolat" }
 *  - POST (et non GET) : le terme n'apparaît pas dans l'URL, donc pas dans les journaux d'accès ;
 *  - AUCUN console.log / journalisation du terme, ni des erreurs qui pourraient le contenir ;
 *  - entrée validée strictement (type, longueur, caractères) avant tout appel sortant ;
 *  - réponses jamais mises en cache (no-store).
 */
export async function POST(req: Request) {
  if (!sameOrigin(req)) return jsonError(403, "forbidden");

  const rl = rateLimit(`search:${clientIp(req.headers)}`, intFromEnv("SEARCH_RATE_LIMIT_PER_MIN", 20), 60_000);
  if (!rl.ok) return jsonError(429, "rate_limited", { "Retry-After": String(rl.retryAfterSec) });

  const declared = Number(req.headers.get("content-length") ?? "0");
  if (!Number.isFinite(declared) || declared > 1024) return jsonError(413, "invalid_query");
  if ((req.headers.get("content-type") ?? "").split(";")[0]!.trim() !== "application/json") return jsonError(415, "invalid_query");

  let body: unknown;
  try {
    const text = await req.text();
    if (text.length > 1024) return jsonError(413, "invalid_query");
    body = JSON.parse(text);
  } catch {
    return jsonError(400, "invalid_query");
  }

  const check = normalizeQuery((body as { q?: unknown } | null)?.q);
  if (!check.ok) return jsonError(400, "invalid_query"); // pas d'écho de l'entrée, pas de détail

  const res = await searchProducts(check.q);
  if (res.kind !== "ok") return jsonError(502, "upstream");
  return NextResponse.json({ products: res.products }, { headers: { "Cache-Control": "no-store" } });
}
