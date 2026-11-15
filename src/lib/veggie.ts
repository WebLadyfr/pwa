import type { NormalizedProduct } from "./score/types";

/**
 * Végétarien / végan, déduit des tags d'ingrédients, d'allergènes et d'ADDITIFS. Fonction pure.
 * Indicatif : l'origine exacte de certains additifs (ex. E471) n'est pas connue sans le fabricant :
 * on le dit (« origine à vérifier ») plutôt que de trancher.
 */
export type VeggieStatus = "vegan" | "vegetarian" | "not_vegetarian" | "unknown";

export interface VeggieResult {
  status: VeggieStatus;
  /** Tags qui rendent le produit non végétarien (viande, poisson, gélatine, additifs d'origine animale…). */
  animal: string[];
  /** Tags qui le rendent non végan (lait, œuf, miel, cire d'abeille…). */
  nonVegan: string[];
  /** Additifs dont l'origine peut être animale OU végétale. */
  uncertain: string[];
}

const NOT_VEGETARIAN_INGREDIENTS = [
  "en:meat", "en:beef", "en:pork", "en:poultry", "en:chicken", "en:turkey", "en:duck", "en:lamb", "en:veal", "en:ham",
  "en:bacon", "en:sausage", "en:meat-extract", "en:fish", "en:tuna", "en:salmon", "en:cod", "en:anchovy", "en:sardine",
  "en:mackerel", "en:seafood", "en:shrimp", "en:crustaceans", "en:molluscs", "en:gelatin", "en:lard", "en:tallow",
  "en:animal-fat", "en:fish-oil", "en:fish-sauce", "en:rennet", "en:collagen", "en:bone-broth",
];
const NOT_VEGETARIAN_ALLERGENS = ["en:fish", "en:crustaceans", "en:molluscs"];
/** Additifs d'origine animale certaine (viande, os, insectes). */
const NOT_VEGETARIAN_ADDITIVES = ["en:e120", "en:e441", "en:e542", "en:e904", "en:e920"];

const NOT_VEGAN_INGREDIENTS = [
  "en:milk", "en:skimmed-milk", "en:whole-milk", "en:milk-powder", "en:skimmed-milk-powder", "en:milk-proteins", "en:milk-protein",
  "en:whey", "en:whey-powder", "en:casein", "en:caseinate", "en:lactose", "en:butter", "en:buttermilk", "en:cream", "en:cheese",
  "en:yogurt", "en:egg", "en:eggs", "en:egg-white", "en:egg-yolk", "en:egg-powder", "en:honey", "en:beeswax", "en:lanolin",
];
const NOT_VEGAN_ALLERGENS = ["en:milk", "en:eggs"];
const NOT_VEGAN_ADDITIVES = ["en:e901", "en:e913", "en:e966", "en:e1105"];

/** Additifs pouvant être d'origine animale ou végétale (selon le fabricant). */
const UNCERTAIN_ADDITIVES = [
  "en:e422", "en:e430", "en:e431", "en:e432", "en:e433", "en:e434", "en:e435", "en:e436",
  "en:e470a", "en:e470b", "en:e471", "en:e472a", "en:e472b", "en:e472c", "en:e472d", "en:e472e", "en:e472f",
  "en:e473", "en:e474", "en:e475", "en:e477", "en:e479b", "en:e481", "en:e482", "en:e483",
  "en:e491", "en:e492", "en:e493", "en:e494", "en:e495", "en:e570", "en:e572", "en:e627", "en:e631", "en:e635", "en:e640",
];

function hits(wanted: string[], present: string[]): string[] {
  const set = new Set(present);
  return wanted.filter((w) => set.has(w));
}

export function veggieStatus(p: NormalizedProduct): VeggieResult {
  const animal = [
    ...hits(NOT_VEGETARIAN_INGREDIENTS, p.ingredientsTags),
    ...hits(NOT_VEGETARIAN_ALLERGENS, p.allergensTags),
    ...hits(NOT_VEGETARIAN_ADDITIVES, p.additivesTags),
  ];
  const nonVegan = [
    ...hits(NOT_VEGAN_INGREDIENTS, p.ingredientsTags),
    ...hits(NOT_VEGAN_ALLERGENS, p.allergensTags),
    ...hits(NOT_VEGAN_ADDITIVES, p.additivesTags),
  ];
  const uncertain = hits(UNCERTAIN_ADDITIVES, p.additivesTags);
  const uniq = (a: string[]) => [...new Set(a)];

  const hasData = p.ingredientsTags.length > 0 || p.additivesTags.length > 0;
  let status: VeggieStatus;
  if (!hasData) status = "unknown";
  else if (animal.length > 0) status = "not_vegetarian";
  else if (nonVegan.length > 0) status = "vegetarian";
  else status = "vegan";
  return { status, animal: uniq(animal), nonVegan: uniq(nonVegan), uncertain };
}
