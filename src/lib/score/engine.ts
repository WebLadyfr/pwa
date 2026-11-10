import type { Level, NormalizedProduct, NutrimentCond, Reason, Rule, RuleSet, ScoreResult } from "./types";

/**
 * Moteur de score : fonction PURE (aucun I/O, aucune règle en dur).
 * Toute la logique métier provient du RuleSet (rules/*.json).
 */

const LEVEL_ORDER: Record<Level, number> = { red: 0, orange: 1, green: 2 };

function compare(value: number, c: NutrimentCond): boolean {
  switch (c.op) {
    case "gte": return value >= c.value;
    case "gt": return value > c.value;
    case "lte": return value <= c.value;
    case "lt": return value < c.value;
  }
}

/** Retourne les ids correspondant, [] si rien. "*" = toute valeur présente. */
function intersect(wanted: string[] | undefined, present: string[]): string[] {
  if (!wanted || wanted.length === 0 || present.length === 0) return [];
  if (wanted.includes("*")) return present;
  const set = new Set(present);
  return wanted.filter((w) => set.has(w));
}

function matchRule(rule: Rule, p: NormalizedProduct): string[] {
  const m = rule.match;
  const items: string[] = [
    ...intersect(m.ingredients, p.ingredientsTags),
    ...intersect(m.additives, p.additivesTags),
    ...intersect(m.allergens, p.allergensTags),
    ...intersect(m.traces, p.tracesTags),
    ...intersect(m.labels, p.labelsTags),
  ];
  if (m.nova && p.novaGroup !== null && m.nova.includes(p.novaGroup)) items.push(`nova:${p.novaGroup}`);
  for (const c of m.nutriments ?? []) {
    const v = p.nutriments[c.key];
    if (typeof v === "number" && Number.isFinite(v) && compare(v, c)) items.push(`nutriment:${c.key}`);
  }
  return [...new Set(items)];
}

export function hasEnoughData(p: NormalizedProduct, rs: RuleSet): boolean {
  return p.ingredientsTags.length >= rs.dataRequirements.minIngredientTags || p.additivesTags.length > 0;
}

export function levelFor(score: number, rs: RuleSet): Level {
  if (score >= rs.scoring.thresholds.green) return "green";
  if (score >= rs.scoring.thresholds.orange) return "orange";
  return "red";
}

export function evaluate(product: NormalizedProduct, rs: RuleSet): ScoreResult {
  if (!hasEnoughData(product, rs)) {
    return { status: "insufficient", ruleSetVersion: rs.version };
  }

  const reasons: Reason[] = [];
  let maxLevel: Level = "green";

  for (const rule of rs.rules) {
    const items = matchRule(rule, product);
    if (items.length === 0) continue;
    reasons.push({
      ruleId: rule.id,
      category: rule.category,
      severity: rule.severity,
      reasonKey: rule.reasonKey,
      points: rule.points,
      items,
    });
    if (rule.forceMaxLevel && LEVEL_ORDER[rule.forceMaxLevel] < LEVEL_ORDER[maxLevel]) {
      maxLevel = rule.forceMaxLevel;
    }
  }

  const malus = reasons.filter((r) => r.points < 0).reduce((s, r) => s + r.points, 0);
  const bonus = Math.min(
    reasons.filter((r) => r.points > 0).reduce((s, r) => s + r.points, 0),
    rs.scoring.caps.maxBonus,
  );
  const raw = rs.scoring.base + malus + bonus;
  const score = Math.round(Math.min(rs.scoring.max, Math.max(rs.scoring.min, raw)));

  let level = levelFor(score, rs);
  if (LEVEL_ORDER[maxLevel] < LEVEL_ORDER[level]) level = maxLevel;

  // Affichage : problèmes d'abord (plus gros malus en tête), puis infos, puis points positifs.
  const rank = (r: Reason) => (r.points < 0 ? 0 : r.severity === "info" ? 2 : r.points > 0 ? 3 : 1);
  reasons.sort((a, b) => rank(a) - rank(b) || a.points - b.points);

  return {
    status: "scored",
    score,
    level,
    reasons,
    ruleSetVersion: rs.version,
    draftRules: rs.validation.status !== "VALIDATED",
  };
}
