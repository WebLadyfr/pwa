import "server-only";
import { createHash, createHmac } from "node:crypto";
import { canonicalExclusions, exclusionsFingerprint } from "@/lib/recipes/exclusions";
import { DEFAULT_MAX_TOKENS, generateRecipes, MIN_RECIPES, type CallModel, type GenerateResult } from "@/lib/recipes/generate";
import { shortIngredientName } from "@/lib/recipes/input";
import { PROMPT_VERSION } from "@/lib/recipes/prompt";
import type { RecipeRequest } from "@/lib/recipes/request";
import { validateRecipes } from "@/lib/recipes/revalidate";
import { parseStoredRecipe } from "@/lib/recipes/schema";
import type { Recipe, Usage } from "@/lib/recipes/types";
import { getKv, upstashConfig, type Kv } from "./kv";

/**
 * Service « recettes » : rate limit, quota, budget de coût, cache, génération. Pur par rapport au réseau :
 * magasin, modèle et recherche produit sont INJECTÉS (tests sans réseau).
 *
 * Confidentialité : aucune clé, aucun journal ne contient d'ingrédient, de recette, de profil ou d'IP en clair.
 * L'IP n'existe ici que sous forme de HMAC salé (compteurs de quota et de débit, durée de vie limitée).
 */

type Env = Record<string, string | undefined>;

export interface RecipeConfig {
  maxTokens: number;
  /** Générations gratuites par mois et par appareil/IP (point d'entrée vers le paiement : voir resolveMonthlyLimit). */
  freeMonthlyQuota: number;
  rateLimitPer10Min: number;
  /** Plafond global quotidien de générations (garde-fou de coût toutes IP confondues). */
  dailyBudget: number;
  cacheTtlSec: number;
}

function intEnv(env: Env, name: string, fallback: number, max = 1_000_000): number {
  const n = Number.parseInt(env[name] ?? "", 10);
  return Number.isFinite(n) && n > 0 ? Math.min(n, max) : fallback;
}

export function readConfig(env: Env = process.env): RecipeConfig {
  return {
    // Plafond dur : même mal configuré, une réponse ne dépasse jamais 4000 tokens.
    maxTokens: intEnv(env, "RECIPE_MAX_TOKENS", DEFAULT_MAX_TOKENS, 4000),
    freeMonthlyQuota: intEnv(env, "RECIPE_FREE_MONTHLY_QUOTA", 10),
    rateLimitPer10Min: intEnv(env, "RECIPES_RATE_LIMIT_PER_10MIN", 6),
    dailyBudget: intEnv(env, "RECIPES_DAILY_BUDGET", 2000),
    cacheTtlSec: intEnv(env, "RECIPE_CACHE_TTL_SEC", 7 * 24 * 3600, 90 * 24 * 3600),
  };
}

/**
 * Point d'extension paiement : retourne le quota mensuel applicable à cette requête.
 * Aujourd'hui, un quota gratuit unique. À l'étape « paiement », remplacer par la lecture d'un droit (jeton d'achat
 * sans lien avec le profil) pour renvoyer un quota supérieur ou illimité — le reste du service n'a pas à changer.
 */
export function resolveMonthlyLimit(config: RecipeConfig): number {
  return config.freeMonthlyQuota;
}

/** La fonction est-elle utilisable dans cet environnement ? (clé API, magasin partagé, sel de hachage d'IP) */
export function recipesAvailable(env: Env = process.env): boolean {
  if (!env.ANTHROPIC_API_KEY) return false;
  const prod = env.NODE_ENV === "production";
  const storeOk = upstashConfig(env) !== null || !prod || env.RECIPES_ALLOW_MEMORY_STORE === "true";
  const saltOk = !prod || (env.RECIPES_IP_SALT ?? "").length >= 16;
  return storeOk && saltOk;
}

/** IP -> pseudonyme (HMAC-SHA256 salé, tronqué). Sans le sel, impossible de remonter à l'IP. */
export function hashIp(ip: string, env: Env = process.env): string {
  return createHmac("sha256", env.RECIPES_IP_SALT || "dev-only-salt").update(ip).digest("hex").slice(0, 32);
}

export interface SeedLookup {
  (code: string): Promise<{ kind: "ok"; name: string | null } | { kind: "not_found" } | { kind: "error" }>;
}

export interface ServiceDeps {
  kv: Kv;
  callModel: CallModel;
  lookupSeedName: SeedLookup;
  now: () => number;
  config: RecipeConfig;
  log: (entry: Record<string, unknown>) => void;
}
export interface ServiceResponse { status: number; body: Record<string, unknown>; headers?: Record<string, string> }

const WINDOW_MS = 10 * 60_000;
const MONTH_TTL = 40 * 24 * 3600;
const GENERATION_DEADLINE_MS = 50_000;

const iso = (ms: number) => new Date(ms).toISOString();

export function cacheKey(code: string, rulesVersion: string, lang: string, req: Pick<RecipeRequest, "exclusions">): string {
  const fp = createHash("sha256").update(exclusionsFingerprint(canonicalExclusions(req.exclusions))).digest("hex").slice(0, 20);
  // Aucune donnée personnelle : code-barres + versions + langue + empreinte (non réversible) des exclusions.
  return `rc:p${PROMPT_VERSION}:${code}:${rulesVersion}:${lang}:${fp}`;
}

/** Nom du produit d'Open Food Facts -> nom d'ingrédient propre (voir shortIngredientName). */
export const seedNameFrom = shortIngredientName;

const fail = (status: number, error: string, extra: Record<string, unknown> = {}, headers?: Record<string, string>): ServiceResponse => ({
  status,
  body: { error, ...extra },
  ...(headers ? { headers } : {}),
});

export async function runRecipeService(req: RecipeRequest, ipHash: string, deps: ServiceDeps): Promise<ServiceResponse> {
  const { kv, config } = deps;
  const t0 = deps.now();
  const day = iso(t0).slice(0, 10);
  const month = iso(t0).slice(0, 7);
  const limit = resolveMonthlyLimit(config);
  const quotaKey = `rq:${ipHash}:${month}`;
  const exclusions = canonicalExclusions(req.exclusions);
  let usage: Usage | null = null;
  let outcome = "error";
  let cached = false;
  let accepted = 0;

  const done = (r: ServiceResponse): ServiceResponse => {
    // Journal de COÛT : uniquement des compteurs. Jamais d'ingrédient, de recette, d'IP, de profil ni de clé de cache.
    deps.log({
      evt: "recipes",
      mode: req.mode,
      outcome,
      cached,
      calls: usage?.calls ?? 0,
      input_tokens: usage?.inputTokens ?? 0,
      output_tokens: usage?.outputTokens ?? 0,
      cache_read_tokens: usage?.cacheReadTokens ?? 0,
      cache_creation_tokens: usage?.cacheCreationTokens ?? 0,
      recipes: accepted,
    });
    return r;
  };

  let reservedQuota = false;
  let reservedBudget = false;
  const refund = async () => {
    try {
      if (reservedQuota) await kv.decr(quotaKey);
      if (reservedBudget && (usage?.calls ?? 0) === 0) await kv.decr(`rb:${day}`);
    } catch {
      /* au pire, un compteur reste un cran trop haut */
    }
  };

  try {
    // 1) Rate limit distribué (fenêtre fixe de 10 min) — compte toutes les requêtes, cache ou non.
    const win = Math.floor(t0 / WINDOW_MS);
    const hits = await kv.incr(`rl:rec:${ipHash}:${win}`, Math.ceil((2 * WINDOW_MS) / 1000));
    if (hits > config.rateLimitPer10Min) {
      outcome = "rate_limited";
      const retry = Math.max(1, Math.ceil(((win + 1) * WINDOW_MS - t0) / 1000));
      return done(fail(429, "rate_limited", {}, { "Retry-After": String(retry) }));
    }

    // 2) Cache (mode scan, hors « Régénérer ») : ne consomme NI quota NI tokens.
    const key = req.mode === "seed" ? cacheKey(req.code!, req.rulesVersion, req.lang, req) : null;
    if (key && !req.regenerate) {
      const hit = await kv.get(key);
      if (hit) {
        const recipes = parseCachedRecipes(hit);
        // Revalidé à la sortie du cache : si le lexique ou les règles ont évolué depuis, une recette périmée n'est pas servie.
        const ok = validateRecipes(recipes, exclusions).accepted;
        if (ok.length >= MIN_RECIPES) {
          outcome = "cache_hit";
          cached = true;
          accepted = ok.length;
          const used = Number((await kv.get(quotaKey)) ?? 0) || 0;
          return done({ status: 200, body: { recipes: ok, cached: true, quota: { limit, used: Math.min(used, limit) } } });
        }
      }
    }

    // 3) Produit de départ : le serveur retrouve LUI-MÊME le nom (jamais fourni par le client => cache non empoisonnable).
    let ingredients: string[];
    if (req.mode === "seed") {
      const seed = await deps.lookupSeedName(req.code!);
      if (seed.kind === "error") {
        outcome = "seed_upstream";
        return done(fail(503, "unavailable"));
      }
      const name = seed.kind === "ok" ? seedNameFrom(seed.name) : null;
      if (!name) {
        outcome = "seed_not_found";
        return done(fail(404, "product_not_found"));
      }
      ingredients = [name];
    } else {
      ingredients = req.ingredients ?? [];
    }

    // 4) Garde-fou de coût global, puis quota mensuel (réservation ; remboursé si rien n'est livré).
    const budget = await kv.incr(`rb:${day}`, 2 * 24 * 3600);
    reservedBudget = true;
    if (budget > config.dailyBudget) {
      outcome = "budget_exhausted";
      await refund();
      return done(fail(503, "unavailable"));
    }
    const used = await kv.incr(quotaKey, MONTH_TTL);
    reservedQuota = true;
    if (used > limit) {
      outcome = "quota_exceeded";
      await refund();
      return done(fail(429, "quota_exceeded", { quota: { limit, used: limit } }));
    }

    // 5) Génération + revalidation (module pur).
    const result: GenerateResult = await generateRecipes(
      { mode: req.mode, ingredients, exclusions, lang: req.lang as "fr" },
      { callModel: deps.callModel, maxTokens: config.maxTokens, now: deps.now, deadline: t0 + GENERATION_DEADLINE_MS },
    );
    usage = result.usage;

    if (result.kind === "ok") {
      outcome = "ok";
      accepted = result.recipes.length;
      if (key) await kv.set(key, JSON.stringify(result.recipes), config.cacheTtlSec).catch(() => undefined);
      return done({ status: 200, body: { recipes: result.recipes, cached: false, quota: { limit, used } } });
    }

    outcome = result.kind;
    await refund(); // rien de livré : l'utilisatrice n'est pas débitée
    reservedQuota = false;
    switch (result.kind) {
      case "incompatible": return done(fail(422, "incompatible_ingredients"));
      case "not_enough": return done(fail(422, "not_enough_recipes"));
      case "unavailable": return done(fail(503, "unavailable"));
      default: return done(fail(502, "generation_failed"));
    }
  } catch {
    // Magasin partagé injoignable, etc. : on échoue FERMÉ (pas de plafond de coût contournable) et sans détail technique.
    outcome = "store_error";
    await refund();
    return done(fail(503, "unavailable"));
  }
}

function parseCachedRecipes(raw: string): Recipe[] {
  try {
    const arr: unknown = JSON.parse(raw);
    if (!Array.isArray(arr)) return [];
    return arr.slice(0, 8).map(parseStoredRecipe).filter((r): r is Recipe => r !== null);
  } catch {
    return [];
  }
}

export { getKv };
