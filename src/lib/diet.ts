import type { RuleSet } from "./score/types";

/**
 * Niveau de rigueur du régime. Ne change PAS les règles (rules/*.json) : seulement les seuils de couleur
 * (et, pour « en cours de test », l'affichage). Fonction pure, testable, sans accès navigateur.
 *
 *  - strict : règles appliquées telles quelles (comportement historique).
 *  - test   : phase de réintroduction (on teste un aliment à la fois) : mêmes seuils que « strict »,
 *             mais les fiches rappellent comment tester et renvoient vers le suivi des symptômes.
 *  - souple : tolérance plus large (seuils vert/orange abaissés). Les règles qui plafonnent le niveau
 *             (forceMaxLevel) restent appliquées.
 */
export const DIET_MODES = ["strict", "test", "souple"] as const;
export type DietMode = (typeof DIET_MODES)[number];
export const DEFAULT_DIET: DietMode = "strict";

export const SOUPLE_THRESHOLDS = { green: 55, orange: 30 } as const;

export function parseDietMode(v: unknown): DietMode {
  return DIET_MODES.includes(v as DietMode) ? (v as DietMode) : DEFAULT_DIET;
}

/** Retourne un jeu de règles ajusté. La version change avec le mode : les favoris sont alors recalculés. */
export function applyDietMode(rs: RuleSet, mode: DietMode): RuleSet {
  if (mode !== "souple") return rs;
  return {
    ...rs,
    version: `${rs.version}+souple`,
    scoring: { ...rs.scoring, thresholds: { ...SOUPLE_THRESHOLDS } },
  };
}
