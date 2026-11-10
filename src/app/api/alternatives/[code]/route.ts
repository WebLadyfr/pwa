import { NextResponse } from "next/server";
import { isValidGtin } from "@/lib/barcode";
import { lookupProduct, searchCandidates } from "@/lib/server/off";
import { jsonError } from "@/lib/server/http";
import { clientIp, intFromEnv, rateLimit } from "@/lib/server/rate-limit";
import { evaluate } from "@/lib/score/engine";
import { defaultRuleSet } from "@rules/index";

export const runtime = "nodejs";

/**
 * Alternative : même catégorie OFF la plus spécifique, candidats scorés par LE MÊME moteur,
 * on ne propose que si le gain est net (>= 15 points) et le niveau meilleur.
 */
const MIN_GAIN = 15;

export async function GET(req: Request, ctx: { params: Promise<{ code: string }> }) {
  const { code } = await ctx.params;
  if (!isValidGtin(code)) return jsonError(400, "invalid_code");
  const rl = rateLimit(`alt:${clientIp(req.headers)}`, intFromEnv("PRODUCT_RATE_LIMIT_PER_MIN", 60) / 4, 60_000);
  if (!rl.ok) return jsonError(429, "rate_limited", { "Retry-After": String(rl.retryAfterSec) });

  const src = await lookupProduct(code);
  if (src.kind !== "ok") return NextResponse.json({ alternative: null });
  const current = evaluate(src.product, defaultRuleSet);
  const category = src.product.categoriesTags.at(-1);
  if (current.status !== "scored" || !category) return NextResponse.json({ alternative: null });

  const candidates = await searchCandidates(category);
  let best: { product: (typeof candidates)[number]; score: number; level: string } | null = null;
  for (const c of candidates) {
    if (c.code === code || !c.name) continue;
    const r = evaluate(c, defaultRuleSet);
    if (r.status !== "scored") continue;
    if (r.score >= current.score + MIN_GAIN && (!best || r.score > best.score)) {
      best = { product: c, score: r.score, level: r.level };
    }
  }
  return NextResponse.json(
    { alternative: best },
    { headers: { "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400" } },
  );
}
