import type { NormalizedProduct } from "./score/types";

/**
 * Halal, déduit des tags d'ingrédients, d'additifs et de labels. Fonction pure.
 * INDICATIF : une liste d'ingrédients ne prouve ni le mode d'abattage ni l'origine exacte d'un additif.
 * Seul un logo de certification fait foi. D'où quatre issues :
 *  - not_halal  : porc ou alcool présents ;
 *  - certified  : le label « halal » figure dans la fiche Open Food Facts (et rien d'interdit) ;
 *  - check      : viande/volaille (abattage à vérifier) ou additif/ingrédient d'origine incertaine ;
 *  - compatible : rien d'interdit ni d'incertain dans les données connues ;
 *  - unknown    : données insuffisantes.
 */
export type HalalStatus = "not_halal" | "certified" | "check" | "compatible" | "unknown";

export interface HalalResult {
  status: HalalStatus;
  /** Ingrédients interdits (porc, alcool…). */
  forbidden: string[];
  /** Viande ou volaille : l'abattage ne peut pas être vérifié. */
  meat: string[];
  /** Ingrédients/additifs d'origine animale possible (gélatine, E471, carmin…). */
  doubtful: string[];
}

const FORBIDDEN_INGREDIENTS = [
  "en:pork", "en:ham", "en:bacon", "en:lard", "en:pork-fat", "en:pork-gelatin", "en:salami", "en:cured-ham", "en:sausage",
  "en:alcohol", "en:wine", "en:beer", "en:spirit", "en:rum", "en:liquor", "en:ethanol", "en:cider", "en:white-wine", "en:red-wine", "en:brandy", "en:whisky",
];
const MEAT_INGREDIENTS = [
  "en:meat", "en:beef", "en:poultry", "en:chicken", "en:turkey", "en:duck", "en:lamb", "en:veal", "en:meat-extract",
  "en:mutton", "en:goat", "en:bone-broth", "en:animal-fat", "en:tallow",
];
const DOUBTFUL_INGREDIENTS = ["en:gelatin", "en:rennet", "en:collagen", "en:animal-rennet"];
/** E441 gélatine, E542 phosphate d'os, E904 gomme-laque, E120 carmin, E920 L-cystéine : origine animale. */
const DOUBTFUL_ADDITIVES = [
  "en:e120", "en:e441", "en:e542", "en:e904", "en:e920",
  "en:e422", "en:e430", "en:e431", "en:e432", "en:e433", "en:e434", "en:e435", "en:e436",
  "en:e470a", "en:e470b", "en:e471", "en:e472a", "en:e472b", "en:e472c", "en:e472d", "en:e472e", "en:e472f",
  "en:e473", "en:e474", "en:e475", "en:e477", "en:e479b", "en:e481", "en:e482", "en:e483",
  "en:e491", "en:e492", "en:e493", "en:e494", "en:e495", "en:e570", "en:e572", "en:e627", "en:e631", "en:e635", "en:e640",
];
const HALAL_LABELS = ["en:halal", "en:halal-certified"];

const hits = (wanted: string[], present: string[]) => {
  const set = new Set(present);
  return wanted.filter((w) => set.has(w));
};

export function halalStatus(p: NormalizedProduct): HalalResult {
  const forbidden = hits(FORBIDDEN_INGREDIENTS, p.ingredientsTags);
  const meat = hits(MEAT_INGREDIENTS, p.ingredientsTags);
  const doubtful = [...hits(DOUBTFUL_INGREDIENTS, p.ingredientsTags), ...hits(DOUBTFUL_ADDITIVES, p.additivesTags)];
  const certified = hits(HALAL_LABELS, p.labelsTags).length > 0;
  const hasData = p.ingredientsTags.length > 0 || p.additivesTags.length > 0;

  let status: HalalStatus;
  if (forbidden.length > 0) status = "not_halal";
  else if (certified) status = "certified";
  else if (!hasData) status = "unknown";
  else if (meat.length > 0 || doubtful.length > 0) status = "check";
  else status = "compatible";
  return { status, forbidden: [...new Set(forbidden)], meat: [...new Set(meat)], doubtful: [...new Set(doubtful)] };
}
