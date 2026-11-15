import { NextResponse } from "next/server";
import { isValidGtin } from "@/lib/barcode";
import { lookupProduct, searchCandidates } from "@/lib/server/off";
import { jsonError } from "@/lib/server/http";
import { clientIp, intFromEnv, rateLimit } from "@/lib/server/rate-limit";

export const runtime = "nodejs";

/**
 * Candidats d'alternative : produits de la même catégorie OFF la plus spécifique (les plus scannés).
 * Le SERVEUR NE SCORE PAS : il ne connaît pas le profil de la personne (jamais envoyé). Le navigateur note les candidats
 * avec SES règles (profils cumulés, régime) et ne propose que si le gain est net.
 */
const MAX_CANDIDATES = 24;

export async function GET(req: Request, ctx: { params: Promise<{ code: string }> }) {
  const { code } = await ctx.params;
  if (!isValidGtin(code)) return jsonError(400, "invalid_code");
  const rl = rateLimit(`alt:${clientIp(req.headers)}`, intFromEnv("PRODUCT_RATE_LIMIT_PER_MIN", 60) / 4, 60_000);
  if (!rl.ok) return jsonError(429, "rate_limited", { "Retry-After": String(rl.retryAfterSec) });

  const src = await lookupProduct(code);
  if (src.kind !== "ok") return NextResponse.json({ candidates: [] });
  const category = src.product.categoriesTags.at(-1);
  if (!category) return NextResponse.json({ candidates: [] });

  const candidates = (await searchCandidates(category)).filter((c) => c.code && c.code !== code && c.name).slice(0, MAX_CANDIDATES);
  return NextResponse.json(
    { candidates },
    { headers: { "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400" } },
  );
}
