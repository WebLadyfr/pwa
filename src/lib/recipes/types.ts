export interface RecipeIngredient { name: string; quantity: string }

/** Recette telle qu'affichée / stockée sur l'appareil. Tout texte a été assaini ; `id` est recalculé côté client. */
export interface Recipe {
  id: string;
  title: string;
  minutes: number;
  servings: number;
  ingredients: RecipeIngredient[];
  steps: string[];
  tip: string | null;
  /** Indice glycémique estimé par le modèle (indicatif) ; null si inconnu (anciennes recettes). */
  glycemic: "low" | "medium" | "high" | null;
}

export interface Usage {
  /** Nombre d'appels au modèle pour cette demande. */
  calls: number;
  inputTokens: number;
  outputTokens: number;
  cacheCreationTokens: number;
  cacheReadTokens: number;
}

export const EMPTY_USAGE: Usage = { calls: 0, inputTokens: 0, outputTokens: 0, cacheCreationTokens: 0, cacheReadTokens: 0 };
