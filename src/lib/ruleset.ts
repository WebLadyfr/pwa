import { DEFAULT_PROFILE, PROFILES } from "@rules/index";
import { applyDietMode } from "./diet";
import { mergeRuleSets } from "./score/merge";
import type { RuleSet } from "./score/types";
import { getDietMode, getProfileIds } from "./storage";

/**
 * Jeu de règles actif : profils enregistrés (ou de session, ou par défaut) fusionnés au plus strict,
 * puis ajustés au niveau de rigueur du régime.
 */
export function getActiveRuleSet(): RuleSet {
  const sets = getProfileIds().map((id) => PROFILES[id]).filter((x): x is RuleSet => !!x);
  const base = sets.length > 0 ? mergeRuleSets(sets) : PROFILES[DEFAULT_PROFILE]!;
  return applyDietMode(base, getDietMode());
}
