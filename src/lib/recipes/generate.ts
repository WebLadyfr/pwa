import type { Locale } from "@/i18n";
import type { Exclusions } from "./exclusions";
import { cleanIngredientList } from "./input";
import { buildUserMessage, SYSTEM_PROMPT } from "./prompt";
import { checkText, validateRecipes } from "./revalidate";
import { parseModelOutput } from "./schema";
import { EMPTY_USAGE, type Recipe, type Usage } from "./types";

/**
 * Orchestration de la génération. Module PUR : l'appel réseau au modèle est INJECTÉ (`callModel`),
 * ce qui le rend testable sans réseau et sans clé. Aucune notion de profil : seulement des exclusions.
 *
 *  1) ingrédients nettoyés ; ceux que les exclusions interdisent sont retirés AVANT d'appeler le modèle ;
 *  2) un appel ; réponse invalide (JSON ou schéma) -> UNE seule nouvelle tentative, sinon échec ;
 *  3) revalidation par le moteur de règles + filtre d'allégations de santé ;
 *  4) moins de MIN_RECIPES recettes valides -> UNE relance en citant les aliments refusés ; sinon « pas assez ».
 */
export const MIN_RECIPES = 2;
export const MAX_RECIPES = 5;
export const REQUEST_RECIPES = 4;
export const DEFAULT_MAX_TOKENS = 2500;
/** 2 passes x (1 appel + 1 nouvelle tentative sur réponse invalide). */
export const DEFAULT_MAX_CALLS = 4;
/** Marge minimale restante avant l'échéance pour oser un nouvel appel. */
const MIN_TIME_PER_CALL_MS = 12_000;

export interface ModelRequest { system: string; user: string; maxTokens: number }
export type ModelResponse =
  | { ok: true; text: string; stopReason: string | null; usage: Partial<Omit<Usage, "calls">> }
  | { ok: false };
export type CallModel = (req: ModelRequest) => Promise<ModelResponse>;

export interface GenerateInput {
  mode: "seed" | "list";
  ingredients: unknown;
  exclusions: Exclusions;
  lang: Locale;
}
export interface GenerateDeps {
  callModel: CallModel;
  maxTokens?: number;
  maxCalls?: number;
  /** Horloge injectable (ms) et échéance absolue (ms) : évite de lancer un appel qui ne pourrait pas finir. */
  now?: () => number;
  deadline?: number;
}

export type GenerateResult =
  | { kind: "ok"; recipes: Recipe[]; usage: Usage; rejected: number }
  | { kind: "incompatible"; usage: Usage }
  | { kind: "not_enough"; usage: Usage; rejected: number }
  | { kind: "failed"; usage: Usage }
  | { kind: "unavailable"; usage: Usage };

type Attempt = { kind: "ok"; recipes: Recipe[] } | { kind: "invalid" } | { kind: "unavailable" } | { kind: "budget" };

export async function generateRecipes(input: GenerateInput, deps: GenerateDeps): Promise<GenerateResult> {
  const usage: Usage = { ...EMPTY_USAGE };
  const maxCalls = deps.maxCalls ?? DEFAULT_MAX_CALLS;
  const maxTokens = deps.maxTokens ?? DEFAULT_MAX_TOKENS;
  const now = deps.now ?? Date.now;

  const cleaned = cleanIngredientList(input.ingredients);
  // Un ingrédient que les règles excluent n'est jamais transmis au modèle.
  const usable = cleaned.filter((name) => checkText(name, input.exclusions).groups.length === 0);
  if (usable.length === 0) return { kind: "incompatible", usage };

  async function attempt(refused: string[]): Promise<Attempt> {
    const user = buildUserMessage({ mode: input.mode, ingredients: usable, exclusions: input.exclusions, lang: input.lang, count: REQUEST_RECIPES, refused });
    for (let n = 0; n < 2; n++) {
      if (usage.calls >= maxCalls) return { kind: "budget" };
      if (deps.deadline !== undefined && deps.deadline - now() < MIN_TIME_PER_CALL_MS) return { kind: "budget" };
      usage.calls += 1;
      const res = await deps.callModel({ system: SYSTEM_PROMPT, user, maxTokens });
      if (!res.ok) return { kind: "unavailable" };
      usage.inputTokens += res.usage.inputTokens ?? 0;
      usage.outputTokens += res.usage.outputTokens ?? 0;
      usage.cacheCreationTokens += res.usage.cacheCreationTokens ?? 0;
      usage.cacheReadTokens += res.usage.cacheReadTokens ?? 0;
      const parsed = parseModelOutput(res.text);
      if (parsed.ok) return { kind: "ok", recipes: parsed.recipes };
      // sinon : réponse invalide (JSON cassé, schéma non respecté, coupée par max_tokens) -> une seule nouvelle tentative
    }
    return { kind: "invalid" };
  }

  const accepted = new Map<string, Recipe>();
  let rejected = 0;
  let refused: string[] = [];
  for (let pass = 0; pass < 2; pass++) {
    const r = await attempt(refused);
    if (r.kind === "unavailable") return { kind: "unavailable", usage };
    if (r.kind !== "ok") return { kind: "failed", usage };
    const v = validateRecipes(r.recipes, input.exclusions);
    rejected += v.rejected.length;
    for (const recipe of v.accepted) if (!accepted.has(recipe.id)) accepted.set(recipe.id, recipe);
    if (accepted.size >= MIN_RECIPES) break;
    refused = [...new Set([...refused, ...v.refused])];
  }

  if (accepted.size < MIN_RECIPES) return { kind: "not_enough", usage, rejected };
  return { kind: "ok", recipes: [...accepted.values()].slice(0, MAX_RECIPES), usage, rejected };
}
