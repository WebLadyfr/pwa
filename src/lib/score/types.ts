export type Level = "green" | "orange" | "red";
export type Severity = "negative" | "warning" | "info" | "positive";
export type Category = "strong_malus" | "medium_malus" | "alert" | "bonus";
export type Op = "gte" | "gt" | "lte" | "lt";

/** Produit normalisé : seule forme que le moteur connaît (indépendante d'OFF / de l'OCR). */
export interface NormalizedProduct {
  code: string | null;
  name: string | null;
  brands: string | null;
  imageUrl: string | null;
  /** Tags normalisés type "en:wheat" (la langue de l'étiquette n'importe pas). */
  ingredientsTags: string[];
  additivesTags: string[];
  allergensTags: string[];
  tracesTags: string[];
  labelsTags: string[];
  categoriesTags: string[];
  novaGroup: 1 | 2 | 3 | 4 | null;
  /** Valeurs pour 100 g, en grammes (convention Open Food Facts). */
  nutriments: Record<string, number>;
}

export interface NutrimentCond {
  key: string;
  op: Op;
  value: number;
}

export interface RuleMatch {
  ingredients?: string[];
  additives?: string[];
  allergens?: string[];
  traces?: string[];
  labels?: string[];
  nova?: number[];
  nutriments?: NutrimentCond[];
}

export interface Rule {
  id: string;
  category: Category;
  points: number;
  severity: Severity;
  reasonKey: string;
  match: RuleMatch;
  forceMaxLevel?: Level;
}

export interface RuleSet {
  profile: string;
  version: string;
  validation: { status: "DRAFT" | "VALIDATED"; validatedBy: string | null; validatedOn: string | null };
  scoring: {
    base: number;
    min: number;
    max: number;
    thresholds: { green: number; orange: number };
    caps: { maxBonus: number };
  };
  dataRequirements: { minIngredientTags: number };
  rules: Rule[];
}

export interface Reason {
  ruleId: string;
  category: Category;
  severity: Severity;
  reasonKey: string;
  points: number;
  /** Ids bruts ayant déclenché la règle (ex. "en:sugar", "nova:4", "sugars_100g"). */
  items: string[];
}

export type ScoreResult =
  | { status: "insufficient"; ruleSetVersion: string }
  | {
      status: "scored";
      score: number;
      level: Level;
      reasons: Reason[];
      ruleSetVersion: string;
      /** true si le jeu de règles n'a pas été validé par un professionnel de santé. */
      draftRules: boolean;
    };
