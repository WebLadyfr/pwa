import hashimotoJson from "./hashimoto.json";
import basedowJson from "./basedow.json";
import coeliaqueJson from "./coeliaque.json";
import lupusJson from "./lupus.json";
import polyarthriteJson from "./polyarthrite.json";
import sepJson from "./sep.json";
import psoriasisJson from "./psoriasis.json";
import miciJson from "./mici.json";
import diabete1Json from "./diabete1.json";
import sjogrenJson from "./sjogren.json";
import generalJson from "./general.json";
import { validateRuleSet } from "@/lib/score/validate";
import type { RuleSet } from "@/lib/score/types";

/**
 * Registre des profils (tous en BROUILLON, à faire relire par un professionnel de santé).
 * Pour en ajouter : créer rules/<profil>.json, l'importer ici, l'ajouter à PROFILES et à src/i18n/messages (profile.<id>).
 * Plusieurs profils peuvent être cochés : leurs règles sont fusionnées au plus strict (src/lib/score/merge.ts).
 */
export const PROFILES: Record<string, RuleSet> = {
  hashimoto: validateRuleSet(hashimotoJson),
  basedow: validateRuleSet(basedowJson),
  coeliaque: validateRuleSet(coeliaqueJson),
  lupus: validateRuleSet(lupusJson),
  polyarthrite: validateRuleSet(polyarthriteJson),
  sep: validateRuleSet(sepJson),
  psoriasis: validateRuleSet(psoriasisJson),
  mici: validateRuleSet(miciJson),
  diabete1: validateRuleSet(diabete1Json),
  sjogren: validateRuleSet(sjogrenJson),
  general: validateRuleSet(generalJson),
};

export const DEFAULT_PROFILE = "hashimoto";
export const defaultRuleSet: RuleSet = PROFILES[DEFAULT_PROFILE]!;
