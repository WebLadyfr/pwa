import { cleanTags } from "@/lib/sanitize";
import type { RuleSet } from "@/lib/score/types";
import labels from "./config/exclusion-labels.json";
import { wordsForTags } from "./lexicon";

/**
 * « Liste d'exclusions » : la SEULE chose que le module de recettes sait du profil.
 *
 * Elle est dérivée des règles (rules/*.json) : toute règle à points négatifs qui vise des INGRÉDIENTS
 * devient un groupe d'exclusion. Ajouter un profil (AIP, cœliaque...) ou en cumuler plusieurs (union
 * = règle la plus stricte) ne demande AUCUNE modification de ce code ni du module de génération.
 *
 * Le nom du profil et le diagnostic n'apparaissent nulle part ici : seulement des identifiants de règle
 * génériques (« gluten », « soy ») et des tags d'ingrédients.
 */
export interface ExclusionGroup {
  /** Identifiant de règle (a-z, 0-9, _), sert à choisir un libellé neutre (« sans gluten »). */
  id: string;
  /** Tags normalisés (en:wheat...). */
  tags: string[];
}
export interface Exclusions { groups: ExclusionGroup[] }

export const MAX_GROUPS = 24;
export const MAX_TAGS_PER_GROUP = 80;
export const GROUP_ID_RE = /^[a-z0-9_]{1,32}$/;

/** Catégories de règles dont les malus d'ingrédients deviennent des exclusions de recettes. */
const EXCLUDING_CATEGORIES: ReadonlySet<string> = new Set(["strong_malus", "medium_malus", "alert"]);

export function deriveExclusions(ruleSets: readonly RuleSet[]): Exclusions {
  const byId = new Map<string, Set<string>>();
  for (const rs of ruleSets) {
    for (const rule of rs.rules) {
      if (rule.points >= 0 || !EXCLUDING_CATEGORIES.has(rule.category)) continue;
      const m = rule.match;
      if (!m.ingredients || m.ingredients.length === 0) continue; // malus sur NOVA / nutriments : pas un ingrédient
      const tags = [...m.ingredients, ...(m.additives ?? []), ...(m.allergens ?? []).filter((a) => a !== "*")];
      const set = byId.get(rule.id) ?? new Set<string>();
      tags.forEach((t) => set.add(t));
      byId.set(rule.id, set);
    }
  }
  return canonicalExclusions({ groups: [...byId].map(([id, set]) => ({ id, tags: [...set] })) });
}

/** Forme canonique : ids valides, tags validés, triés, sans doublon, groupes vides retirés. Sert aussi de clé de cache. */
export function canonicalExclusions(ex: Exclusions): Exclusions {
  const groups: ExclusionGroup[] = [];
  for (const g of ex.groups) {
    if (!GROUP_ID_RE.test(g.id)) continue;
    const tags = [...new Set(cleanTags(g.tags))].sort().slice(0, MAX_TAGS_PER_GROUP);
    if (tags.length > 0) groups.push({ id: g.id, tags });
  }
  groups.sort((a, b) => a.id.localeCompare(b.id));
  return { groups: groups.slice(0, MAX_GROUPS) };
}

/** Texte canonique (sans donnée personnelle) à hacher pour la clé de cache. */
export function exclusionsFingerprint(ex: Exclusions): string {
  return canonicalExclusions(ex).groups.map((g) => `${g.id}=${g.tags.join(",")}`).join(";");
}

/**
 * Jeu de règles SYNTHÉTIQUE : une règle par groupe, qui « se déclenche » si un tag d'ingrédient du groupe est présent.
 * Permet de réutiliser tel quel le moteur de score (`evaluate`) pour revalider les recettes, sans le modifier.
 */
export function exclusionsRuleSet(ex: Exclusions): RuleSet {
  return {
    profile: "recipe-exclusions",
    version: "0",
    validation: { status: "DRAFT", validatedBy: null, validatedOn: null },
    scoring: { base: 50, min: 0, max: 100, thresholds: { green: 65, orange: 40 }, caps: { maxBonus: 0 } },
    dataRequirements: { minIngredientTags: 1 },
    rules: ex.groups.map((g) => ({
      id: g.id,
      category: "strong_malus" as const,
      points: -1,
      severity: "negative" as const,
      reasonKey: "recipes.excluded",
      match: { ingredients: g.tags },
    })),
  };
}

const LABELS = labels as Record<string, string>;

/**
 * Lignes d'instruction pour le modèle : un libellé NEUTRE par groupe (« sans gluten ») + des exemples d'aliments.
 * Les libellés viennent d'un fichier serveur : aucune chaîne fournie par le client n'est recopiée dans le prompt.
 */
export function describeExclusions(ex: Exclusions): string[] {
  return canonicalExclusions(ex).groups.map((g) => {
    const label = LABELS[g.id] ?? `sans ${wordsForTags(g.tags, 3).join(", ") || "certains aliments"}`;
    const examples = wordsForTags(g.tags, 12);
    return examples.length > 0 ? `${label} (aucun de ces aliments, ni leurs dérivés : ${examples.join(", ")})` : label;
  });
}
