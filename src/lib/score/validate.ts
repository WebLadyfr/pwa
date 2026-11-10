import type { RuleSet } from "./types";

/**
 * Valide un fichier de règles au chargement : une faute de frappe dans le JSON
 * (édité par un non-développeur) doit échouer bruyamment, pas silencieusement.
 */
const CATEGORIES = ["strong_malus", "medium_malus", "alert", "bonus"];
const SEVERITIES = ["negative", "warning", "info", "positive"];
const LEVELS = ["green", "orange", "red"];
const OPS = ["gte", "gt", "lte", "lt"];
const TAG = /^[a-z]{2,3}:[a-z0-9-]+$/;

function fail(msg: string): never {
  throw new Error(`Règles invalides : ${msg}`);
}
const isObj = (x: unknown): x is Record<string, unknown> => typeof x === "object" && x !== null && !Array.isArray(x);

function tags(id: string, field: string, v: unknown, allowStar: boolean) {
  if (v === undefined) return;
  if (!Array.isArray(v)) fail(`${id}.${field} doit être un tableau`);
  for (const t of v) {
    if (typeof t !== "string" || !(TAG.test(t) || (allowStar && t === "*"))) fail(`${id}.${field} : identifiant invalide "${String(t)}"`);
  }
}

export function validateRuleSet(input: unknown): RuleSet {
  if (!isObj(input)) fail("racine non objet");
  const s = input.scoring;
  if (!isObj(s) || typeof s.base !== "number" || typeof s.min !== "number" || typeof s.max !== "number") fail("scoring");
  if (!isObj(s.thresholds) || typeof s.thresholds.green !== "number" || typeof s.thresholds.orange !== "number") fail("scoring.thresholds");
  if (s.thresholds.orange >= s.thresholds.green) fail("seuil orange doit être < seuil vert");
  if (!isObj(s.caps) || typeof s.caps.maxBonus !== "number") fail("scoring.caps.maxBonus");
  if (!isObj(input.dataRequirements) || typeof input.dataRequirements.minIngredientTags !== "number") fail("dataRequirements");
  if (!isObj(input.validation) || !["DRAFT", "VALIDATED"].includes(String(input.validation.status))) fail("validation.status");
  if (typeof input.profile !== "string" || typeof input.version !== "string") fail("profile/version");
  if (!Array.isArray(input.rules) || input.rules.length === 0) fail("rules vide");

  const ids = new Set<string>();
  for (const r of input.rules as unknown[]) {
    if (!isObj(r)) fail("règle non objet");
    const id = String(r.id);
    if (!/^[a-z0-9_]+$/.test(id)) fail(`id "${id}"`);
    if (ids.has(id)) fail(`id dupliqué "${id}"`);
    ids.add(id);
    if (!CATEGORIES.includes(String(r.category))) fail(`${id}.category`);
    if (!SEVERITIES.includes(String(r.severity))) fail(`${id}.severity`);
    if (typeof r.points !== "number" || !Number.isFinite(r.points)) fail(`${id}.points`);
    if (typeof r.reasonKey !== "string") fail(`${id}.reasonKey`);
    if (r.forceMaxLevel !== undefined && !LEVELS.includes(String(r.forceMaxLevel))) fail(`${id}.forceMaxLevel`);
    if (!isObj(r.match)) fail(`${id}.match`);
    const m = r.match;
    tags(id, "ingredients", m.ingredients, false);
    tags(id, "additives", m.additives, false);
    tags(id, "labels", m.labels, false);
    tags(id, "allergens", m.allergens, true);
    tags(id, "traces", m.traces, true);
    if (m.nova !== undefined && (!Array.isArray(m.nova) || m.nova.some((n) => ![1, 2, 3, 4].includes(n as number)))) fail(`${id}.nova`);
    if (m.nutriments !== undefined) {
      if (!Array.isArray(m.nutriments)) fail(`${id}.nutriments`);
      for (const c of m.nutriments as unknown[]) {
        if (!isObj(c) || typeof c.key !== "string" || !OPS.includes(String(c.op)) || typeof c.value !== "number") fail(`${id}.nutriments`);
      }
    }
    if (Object.keys(m).length === 0) fail(`${id}.match vide`);
  }
  return input as unknown as RuleSet;
}
