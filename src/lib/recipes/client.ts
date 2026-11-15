import type { Locale } from "@/i18n";
import { getActiveRuleSet } from "@/lib/ruleset";
import { deriveExclusions, type Exclusions } from "./exclusions";
import { validateRecipes } from "./revalidate";
import { parseStoredRecipe } from "./schema";
import type { Recipe } from "./types";

/**
 * Appels vers NOTRE backend (jamais vers l'API du modèle) + revalidation CÔTÉ APPAREIL :
 * même si le serveur est en panne, compromis ou mal configuré, une recette qui contient un ingrédient exclu
 * par les règles du profil actif n'est jamais affichée.
 */

/** Exclusions du profil actif, dérivées des règles locales. Seule chose qui sort de l'appareil au sujet du profil. */
export function getActiveExclusions(): { exclusions: Exclusions; rulesVersion: string } {
  const rs = getActiveRuleSet();
  return { exclusions: deriveExclusions([rs]), rulesVersion: rs.version };
}

export interface QuotaInfo { limit: number; used: number }

export type RecipesOutcome =
  | { kind: "ok"; recipes: Recipe[]; cached: boolean; quota: QuotaInfo | null }
  | { kind: "quota_exceeded"; quota: QuotaInfo | null }
  | { kind: "rate_limited" | "not_enough" | "incompatible" | "unavailable" | "failed" | "offline" | "not_found" | "invalid" | "aborted" };

export type RecipeSource = { mode: "seed"; code: string } | { mode: "list"; ingredients: string[] };

const CLIENT_TIMEOUT_MS = 65_000;

function readQuota(x: unknown): QuotaInfo | null {
  const q = (x as { limit?: unknown; used?: unknown } | null) ?? null;
  return q && typeof q.limit === "number" && typeof q.used === "number" && q.limit > 0 && q.used >= 0
    ? { limit: Math.floor(q.limit), used: Math.floor(q.used) }
    : null;
}

export async function requestRecipes(
  source: RecipeSource,
  opts: { regenerate?: boolean; lang?: Locale; signal?: AbortSignal } = {},
): Promise<RecipesOutcome> {
  if (typeof navigator !== "undefined" && !navigator.onLine) return { kind: "offline" };
  const { exclusions, rulesVersion } = getActiveExclusions();
  const body = {
    ...source,
    exclusions,
    rulesVersion,
    lang: opts.lang ?? "fr",
    ...(opts.regenerate ? { regenerate: true } : {}),
  };
  const timeout = new AbortController();
  const timer = setTimeout(() => timeout.abort(), CLIENT_TIMEOUT_MS);
  opts.signal?.addEventListener("abort", () => timeout.abort(), { once: true });
  try {
    const res = await fetch("/api/recipes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal: timeout.signal,
      cache: "no-store",
    });
    const j = (await res.json().catch(() => ({}))) as { recipes?: unknown; cached?: unknown; quota?: unknown; error?: unknown };
    if (res.ok) {
      const list = Array.isArray(j.recipes) ? j.recipes.slice(0, 8) : [];
      // Données du serveur = non fiables : schéma + assainissement, PUIS revalidation par les règles locales.
      const parsed = list.map(parseStoredRecipe).filter((r): r is Recipe => r !== null);
      const { accepted } = validateRecipes(parsed, exclusions);
      if (accepted.length === 0) return { kind: "not_enough" };
      return { kind: "ok", recipes: accepted, cached: j.cached === true, quota: readQuota(j.quota) };
    }
    if (res.status === 429) return j.error === "quota_exceeded" ? { kind: "quota_exceeded", quota: readQuota(j.quota) } : { kind: "rate_limited" };
    if (res.status === 422) return { kind: j.error === "incompatible_ingredients" ? "incompatible" : "not_enough" };
    if (res.status === 404) return { kind: "not_found" };
    if (res.status === 400 || res.status === 413 || res.status === 415) return { kind: "invalid" };
    if (res.status === 503) return { kind: "unavailable" };
    return { kind: "failed" };
  } catch (e) {
    if ((e as { name?: string })?.name === "AbortError") return opts.signal?.aborted ? { kind: "aborted" } : { kind: "failed" };
    return { kind: "offline" };
  } finally {
    clearTimeout(timer);
  }
}
