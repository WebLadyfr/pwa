import { DEFAULT_PROFILE, PROFILES } from "@rules/index";
import type { RuleSet } from "./score/types";
import { getProfileId } from "./storage";

/** Jeu de règles du profil actif (profil enregistré, ou profil de session, ou profil par défaut). */
export function getActiveRuleSet(): RuleSet {
  return PROFILES[getProfileId()] ?? PROFILES[DEFAULT_PROFILE]!;
}
