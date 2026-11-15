import { NextResponse } from "next/server";
import { RecipeRequestSchema } from "@/lib/recipes/request";
import { jsonError, sameOrigin } from "@/lib/server/http";
import { lookupProduct } from "@/lib/server/off";
import { claudeCaller } from "@/lib/server/recipes-claude";
import { getKv, hashIp, readConfig, recipesAvailable, runRecipeService, type SeedLookup } from "@/lib/server/recipes-service";
import { clientIp } from "@/lib/server/rate-limit";

export const runtime = "nodejs";
// Jusqu'à 2 passes x 2 tentatives : la fonction doit pouvoir durer plus que les 15 s par défaut (vercel.json aligné).
export const maxDuration = 60;

const MAX_BODY = 8 * 1024;

const lookupSeedName: SeedLookup = async (code) => {
  const r = await lookupProduct(code);
  return r.kind === "ok" ? { kind: "ok", name: r.product.name } : r.kind === "not_found" ? { kind: "not_found" } : { kind: "error" };
};

/**
 * POST /api/recipes
 *   { mode: "seed", code, exclusions, rulesVersion, lang }            scan -> recettes
 *   { mode: "list", ingredients[<=15], exclusions, rulesVersion, lang } frigo -> recettes
 * Les deux modes passent par le MÊME service (recipes-service.ts) et le MÊME module de génération (src/lib/recipes).
 *
 * Ce que ce serveur reçoit : des noms d'ingrédients et une liste d'exclusions génériques (« gluten », tags d'ingrédients).
 * Jamais le profil ni le diagnostic (schéma strict : un champ inconnu est refusé), jamais d'identifiant.
 * Il ne journalise aucun contenu (le seul journal est un compteur de tokens, voir recipes-service.ts).
 */
export async function POST(req: Request) {
  if (!sameOrigin(req)) return jsonError(403, "forbidden");
  if (!recipesAvailable()) return jsonError(503, "unavailable");
  const kv = getKv();
  if (!kv) return jsonError(503, "unavailable");

  const declared = Number(req.headers.get("content-length") ?? "0");
  if (!Number.isFinite(declared) || declared > MAX_BODY) return jsonError(413, "invalid_request");
  if ((req.headers.get("content-type") ?? "").split(";")[0]!.trim() !== "application/json") return jsonError(415, "invalid_request");

  let body: unknown;
  try {
    const text = await req.text();
    if (text.length > MAX_BODY) return jsonError(413, "invalid_request");
    body = JSON.parse(text);
  } catch {
    return jsonError(400, "invalid_request");
  }
  const parsed = RecipeRequestSchema.safeParse(body);
  if (!parsed.success) return jsonError(400, "invalid_request"); // pas d'écho de l'entrée, pas de détail de validation

  const res = await runRecipeService(parsed.data, hashIp(clientIp(req.headers)), {
    kv,
    callModel: claudeCaller(),
    lookupSeedName,
    now: Date.now,
    config: readConfig(),
    log: (entry) => console.info(JSON.stringify(entry)),
  });
  return NextResponse.json(res.body, { status: res.status, headers: { "Cache-Control": "no-store", ...res.headers } });
}
