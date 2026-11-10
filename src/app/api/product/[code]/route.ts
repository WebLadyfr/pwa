import { NextResponse } from "next/server";
import { isValidGtin } from "@/lib/barcode";
import { lookupProduct } from "@/lib/server/off";
import { jsonError } from "@/lib/server/http";
import { clientIp, intFromEnv, rateLimit } from "@/lib/server/rate-limit";

export const runtime = "nodejs";

export async function GET(req: Request, ctx: { params: Promise<{ code: string }> }) {
  const { code } = await ctx.params;
  if (!isValidGtin(code)) return jsonError(400, "invalid_code");

  const rl = rateLimit(`product:${clientIp(req.headers)}`, intFromEnv("PRODUCT_RATE_LIMIT_PER_MIN", 60), 60_000);
  if (!rl.ok) return jsonError(429, "rate_limited", { "Retry-After": String(rl.retryAfterSec) });

  const res = await lookupProduct(code);
  if (res.kind === "not_found") return jsonError(404, "not_found");
  if (res.kind === "upstream_error") return jsonError(502, "upstream");

  // Données produit publiques (aucune donnée utilisateur) : cache CDN possible.
  return NextResponse.json(
    { product: res.product },
    { headers: { "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400" } },
  );
}
