import type { NormalizedProduct } from "./score/types";

/**
 * Indice glycémique (IG) ESTIMÉ à partir des ingrédients principaux. Fonction pure.
 * Open Food Facts ne fournit pas l'IG d'un produit emballé (il dépend de la recette, de la cuisson, du repas) :
 * on estime donc d'après les ingrédients glucidiques en tête de liste, avec des valeurs de référence arrondies
 * (tables internationales, ordre de grandeur). Toujours présenté comme INDICATIF.
 */
export type GiLevel = "low" | "medium" | "high";
export type GiResult =
  | { status: "estimate"; level: GiLevel; value: number; basis: string[] }
  | { status: "no_carbs" }
  | { status: "unknown" };

/** Seuils usuels : bas ≤ 55, moyen 56-69, élevé ≥ 70. */
export function giLevel(value: number): GiLevel {
  return value <= 55 ? "low" : value <= 69 ? "medium" : "high";
}

/** IG de référence (arrondis) par tag d'ingrédient Open Food Facts. Ingrédients sans glucides (huiles, viandes…) : absents. */
export const GI_TABLE: Record<string, number> = {
  // sucres et sirops
  "en:glucose": 100, "en:dextrose": 100, "en:glucose-syrup": 95, "en:maltodextrin": 105, "en:rice-syrup": 98, "en:invert-sugar-syrup": 60,
  "en:glucose-fructose-syrup": 70, "en:sugar": 65, "en:cane-sugar": 65, "en:brown-sugar": 65, "en:icing-sugar": 65, "en:caramel": 65,
  "en:honey": 58, "en:maple-syrup": 54, "en:fructose": 15, "en:agave-syrup": 15, "en:coconut-sugar": 54, "en:molasses": 55,
  // céréales, farines, féculents
  "en:wheat-flour": 75, "en:flour": 75, "en:wheat": 70, "en:semolina": 66, "en:durum-wheat-semolina": 55, "en:pasta": 50, "en:couscous": 65,
  "en:whole-wheat-flour": 70, "en:wholegrain-wheat-flour": 70, "en:bread": 75, "en:rice": 70, "en:white-rice": 73, "en:basmati-rice": 58,
  "en:brown-rice": 68, "en:rice-flour": 85, "en:corn": 60, "en:maize": 60, "en:corn-flour": 70, "en:corn-starch": 85, "en:potato-starch": 85,
  "en:modified-starch": 80, "en:starch": 80, "en:tapioca": 70, "en:potato": 78, "en:potato-flakes": 85, "en:sweet-potato": 63, "en:cassava": 46,
  "en:oat": 55, "en:oats": 55, "en:oat-flakes": 55, "en:oat-flour": 55, "en:rolled-oats": 55, "en:rye": 50, "en:rye-flour": 58, "en:barley": 28,
  "en:spelt": 55, "en:spelt-flour": 60, "en:millet": 71, "en:buckwheat": 45, "en:quinoa": 53, "en:malt": 70, "en:malt-extract": 70,
  // légumineuses et oléagineux
  "en:lentil": 30, "en:lentils": 30, "en:chickpea": 28, "en:chickpeas": 28, "en:bean": 30, "en:beans": 30, "en:pea": 45, "en:peas": 45,
  "en:soy": 18, "en:soybeans": 18, "en:peanuts": 14, "en:nuts": 15, "en:almond": 15, "en:walnut": 15, "en:hazelnut": 15, "en:cashew": 25,
  // fruits et légumes
  "en:apple": 38, "en:banana": 52, "en:orange": 43, "en:grape": 59, "en:raisin": 64, "en:date": 42, "en:fig": 50, "en:watermelon": 76,
  "en:pineapple": 59, "en:mango": 51, "en:strawberry": 40, "en:fruit-juice": 50, "en:apple-juice": 40, "en:orange-juice": 50,
  "en:carrot": 40, "en:tomato": 15, "en:onion": 10, "en:broccoli": 15, "en:spinach": 15, "en:pumpkin": 65, "en:beetroot": 64,
  // produits laitiers, cacao
  "en:milk": 39, "en:skimmed-milk": 32, "en:milk-powder": 45, "en:yogurt": 35, "en:lactose": 46, "en:whey": 15, "en:cocoa": 20, "en:cocoa-powder": 20,
};

const WEIGHTS = [3, 2, 1];
/** Seuil de glucides (g/100 g) sous lequel l'IG est sans objet. */
export const LOW_CARB_THRESHOLD = 5;

export function estimateGlycemicIndex(p: NormalizedProduct): GiResult {
  const carbs = p.nutriments["carbohydrates_100g"];
  if (typeof carbs === "number" && carbs < LOW_CARB_THRESHOLD) return { status: "no_carbs" };

  // Les 3 premiers ingrédients glucidiques reconnus (ordre de la liste = ordre décroissant d'importance).
  const hits: { tag: string; gi: number }[] = [];
  for (const tag of p.ingredientsTags) {
    const gi = GI_TABLE[tag];
    if (gi !== undefined && !hits.some((h) => h.tag === tag)) hits.push({ tag, gi });
    if (hits.length === WEIGHTS.length) break;
  }
  if (hits.length === 0) return { status: "unknown" };

  const used = hits.map((h, i) => ({ ...h, w: WEIGHTS[i]! }));
  const total = used.reduce((s, h) => s + h.w, 0);
  const value = Math.round(used.reduce((s, h) => s + h.gi * h.w, 0) / total);
  return { status: "estimate", level: giLevel(value), value, basis: used.map((h) => h.tag) };
}
