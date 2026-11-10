import hashimotoJson from "./hashimoto.json";
import { validateRuleSet } from "@/lib/score/validate";
import type { RuleSet } from "@/lib/score/types";

/**
 * Registre des profils. Pour ajouter AIP, cœliaque... :
 *   1) créer rules/aip.json  2) l'importer ici  3) l'ajouter à PROFILES.
 * Le moteur (src/lib/score/engine.ts) n'a pas à changer.
 */
export const PROFILES: Record<string, RuleSet> = {
  hashimoto: validateRuleSet(hashimotoJson),
};

export const DEFAULT_PROFILE = "hashimoto";
export const defaultRuleSet: RuleSet = PROFILES[DEFAULT_PROFILE]!;
