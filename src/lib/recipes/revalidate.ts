import { evaluate } from "@/lib/score/engine";
import type { NormalizedProduct, RuleSet } from "@/lib/score/types";
import { exclusionsRuleSet, type Exclusions } from "./exclusions";
import { findHealthClaims } from "./health";
import { matchLexicon, tagsFromText } from "./lexicon";
import type { Recipe } from "./types";

/**
 * REVALIDATION par notre moteur de règles — la vraie garantie (le modèle n'est jamais cru sur parole).
 *
 * Pour chaque recette :
 *  1) chaque nom d'ingrédient est normalisé en tags (lexique) puis évalué par `evaluate()`, le MÊME moteur que le score ;
 *  2) le texte libre (titre, étapes, astuce) est scanné de la même façon : « ajouter la sauce soja » dans une étape
 *     est attrapé même si l'ingrédient n'est pas listé ;
 *  3) le filtre de sortie d'allégations de santé est appliqué à tout le texte.
 * Une recette qui échoue à l'un des trois contrôles n'est JAMAIS affichée.
 *
 * Ce module ne connaît que la « liste d'exclusions » (voir exclusions.ts), jamais le profil.
 */

function productFromTags(tags: string[]): NormalizedProduct {
  return {
    code: null, name: null, brands: null, imageUrl: null,
    ingredientsTags: tags, additivesTags: [], allergensTags: [], tracesTags: [], labelsTags: [], categoriesTags: [],
    novaGroup: null, nutriments: {},
  };
}

const cache = new WeakMap<Exclusions, RuleSet>();
function ruleSetFor(ex: Exclusions): RuleSet {
  let rs = cache.get(ex);
  if (!rs) {
    rs = exclusionsRuleSet(ex);
    cache.set(ex, rs);
  }
  return rs;
}

/** Ids des groupes d'exclusion déclenchés par ces tags (via le moteur de score). */
export function violatedGroups(tags: string[], ex: Exclusions): string[] {
  if (tags.length === 0 || ex.groups.length === 0) return [];
  const r = evaluate(productFromTags(tags), ruleSetFor(ex));
  return r.status === "scored" ? r.reasons.map((x) => x.ruleId) : [];
}

export interface TextCheck { groups: string[]; /** Libellés canoniques (lexique) des aliments en cause. */ refused: string[] }

/** Vérifie un texte libre (nom d'ingrédient, étape...) contre les exclusions. */
export function checkText(text: string, ex: Exclusions): TextCheck {
  const matches = matchLexicon(text);
  const tags = [...new Set(matches.flatMap((m) => m.tags))];
  const groups = violatedGroups(tags, ex);
  if (groups.length === 0) return { groups: [], refused: [] };
  const bad = new Set(ex.groups.filter((g) => groups.includes(g.id)).flatMap((g) => g.tags));
  return { groups, refused: matches.filter((m) => m.tags.some((t) => bad.has(t))).map((m) => m.fr) };
}

export interface RecipeCheck {
  ok: boolean;
  reason: "excluded" | "health_claim" | null;
  /** Libellés canoniques (jamais du texte du modèle) : réutilisables dans une relance sans risque d'injection. */
  refused: string[];
}

export function checkRecipe(recipe: Recipe, ex: Exclusions): RecipeCheck {
  const refused = new Set<string>();
  for (const ing of recipe.ingredients) checkText(ing.name, ex).refused.forEach((r) => refused.add(r));
  for (const text of [recipe.title, ...recipe.steps, recipe.tip ?? ""]) checkText(text, ex).refused.forEach((r) => refused.add(r));
  if (refused.size > 0) return { ok: false, reason: "excluded", refused: [...refused] };

  const all = [recipe.title, ...recipe.ingredients.map((i) => `${i.name} ${i.quantity}`), ...recipe.steps, recipe.tip ?? ""].join(" . ");
  if (findHealthClaims(all).length > 0) return { ok: false, reason: "health_claim", refused: [] };
  return { ok: true, reason: null, refused: [] };
}

export interface ValidationResult {
  accepted: Recipe[];
  rejected: { recipe: Recipe; reason: "excluded" | "health_claim" }[];
  /** Aliments refusés (libellés canoniques, sans doublon) : à citer dans la relance. */
  refused: string[];
}

export function validateRecipes(recipes: readonly Recipe[], ex: Exclusions): ValidationResult {
  const accepted: Recipe[] = [];
  const rejected: ValidationResult["rejected"] = [];
  const refused = new Set<string>();
  for (const recipe of recipes) {
    const c = checkRecipe(recipe, ex);
    if (c.ok) accepted.push(recipe);
    else {
      rejected.push({ recipe, reason: c.reason! });
      c.refused.forEach((r) => refused.add(r));
    }
  }
  return { accepted, rejected, refused: [...refused] };
}

/** Un produit (scanné, ou ligne du frigo) contient-il un ingrédient exclu ? Utilise ses tags OFF ET son nom. */
export function productViolations(
  p: { name: string | null; ingredientsTags: string[]; additivesTags?: string[]; allergensTags?: string[] },
  ex: Exclusions,
): string[] {
  const tags = [...p.ingredientsTags, ...(p.additivesTags ?? []), ...(p.allergensTags ?? []), ...(p.name ? tagsFromText(p.name) : [])];
  return violatedGroups([...new Set(tags)], ex);
}
