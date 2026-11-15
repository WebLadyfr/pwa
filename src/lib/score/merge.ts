import type { Level, Rule, RuleMatch, RuleSet } from "./types";

/**
 * Fusion de plusieurs profils : « au plus strict ».
 *  - une règle présente dans plusieurs profils (même id) n'est comptée qu'UNE fois : malus le plus fort, plafond de niveau le plus sévère,
 *    listes d'ingrédients/additifs réunies ;
 *  - une règle propre à un profil s'ajoute ;
 *  - seuils : les plus exigeants ; la règle garde la liste des profils concernés (`profiles`), pour l'afficher.
 * Fonction pure : le moteur de score n'est pas modifié.
 */
const LEVEL_ORDER: Record<Level, number> = { red: 0, orange: 1, green: 2 };
const LIST_FIELDS = ["ingredients", "additives", "allergens", "traces", "labels", "nova"] as const;

function mergeMatch(a: RuleMatch, b: RuleMatch): RuleMatch {
  const out: RuleMatch = { ...a };
  for (const f of LIST_FIELDS) {
    const x = (a[f] as unknown[] | undefined) ?? [];
    const y = (b[f] as unknown[] | undefined) ?? [];
    if (x.length + y.length > 0) (out as Record<string, unknown>)[f] = [...new Set([...x, ...y])];
  }
  // Conditions chiffrées : on garde celles de la règle la plus stricte (déjà dans `a`) ; sinon celles de b.
  if (!a.nutriments && b.nutriments) out.nutriments = b.nutriments;
  return out;
}

function stricter(a: Rule, b: Rule): Rule {
  const strongerMalus = b.points < a.points ? b : a;
  const force =
    a.forceMaxLevel && b.forceMaxLevel
      ? LEVEL_ORDER[a.forceMaxLevel] <= LEVEL_ORDER[b.forceMaxLevel] ? a.forceMaxLevel : b.forceMaxLevel
      : (a.forceMaxLevel ?? b.forceMaxLevel);
  // Bonus : on garde le plus petit (prudence) ; malus : le plus fort.
  const points = Math.min(a.points, b.points);
  const merged: Rule = {
    ...strongerMalus,
    points,
    match: mergeMatch(strongerMalus.match, strongerMalus === a ? b.match : a.match),
  };
  if (force) merged.forceMaxLevel = force;
  return merged;
}

export function mergeRuleSets(sets: readonly RuleSet[]): RuleSet {
  if (sets.length === 0) throw new Error("mergeRuleSets : aucun profil");
  if (sets.length === 1) return sets[0]!;
  const byId = new Map<string, { rule: Rule; profiles: string[] }>();
  for (const rs of sets) {
    for (const rule of rs.rules) {
      const prev = byId.get(rule.id);
      if (!prev) byId.set(rule.id, { rule, profiles: [rs.profile] });
      else byId.set(rule.id, { rule: stricter(prev.rule, rule), profiles: [...prev.profiles, rs.profile] });
    }
  }
  const rules: Rule[] = [...byId.values()].map(({ rule, profiles }) => ({ ...rule, profiles: [...new Set(profiles)] }));
  const max = (f: (r: RuleSet) => number) => Math.max(...sets.map(f));
  const min = (f: (r: RuleSet) => number) => Math.min(...sets.map(f));
  return {
    profile: sets.map((s) => s.profile).join("+"),
    version: sets.map((s) => `${s.profile}@${s.version}`).join("+"),
    validation: sets.every((s) => s.validation.status === "VALIDATED")
      ? { status: "VALIDATED", validatedBy: null, validatedOn: null }
      : { status: "DRAFT", validatedBy: null, validatedOn: null },
    scoring: {
      base: sets[0]!.scoring.base,
      min: sets[0]!.scoring.min,
      max: sets[0]!.scoring.max,
      thresholds: { green: max((s) => s.scoring.thresholds.green), orange: max((s) => s.scoring.thresholds.orange) },
      caps: { maxBonus: min((s) => s.scoring.caps.maxBonus) },
    },
    dataRequirements: { minIngredientTags: min((s) => s.dataRequirements.minIngredientTags) },
    rules,
  };
}
