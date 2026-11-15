import { z } from "zod";
import { cleanText } from "@/lib/sanitize";
import { hash53, norm } from "./text";
import type { Recipe } from "./types";

/**
 * Schéma de la recette telle que le modèle doit la produire (et telle qu'on la relit du stockage local).
 * Les sorties du modèle sont NON FIABLES : types, longueurs et nombres sont bornés ici, puis chaque texte
 * est assaini (caractères de contrôle, < >) avant de devenir une `Recipe`.
 */
export const RecipeSchema = z.object({
  title: z.string().min(3).max(100),
  minutes: z.number().int().min(1).max(240),
  servings: z.number().int().min(1).max(12),
  ingredients: z
    .array(z.object({ name: z.string().min(1).max(80), quantity: z.string().min(1).max(80) }))
    .min(1)
    .max(20),
  steps: z.array(z.string().min(1).max(300)).min(1).max(10),
  tip: z.string().max(300).nullish(),
  /** Indice glycémique estimé du plat (indicatif). */
  glycemic: z.enum(["low", "medium", "high"]).nullish(),
});
export type RawRecipe = z.infer<typeof RecipeSchema>;

export const ModelOutputSchema = z.object({ recipes: z.array(RecipeSchema).min(1).max(8) });

/** Identifiant stable dérivé du contenu (titre + ingrédients) : permet de dédupliquer et de gérer les favoris. */
export function recipeId(r: { title: string; ingredients: { name: string }[] }): string {
  return hash53(`${norm(r.title)}|${r.ingredients.map((i) => norm(i.name)).sort().join(",")}`);
}

/** RawRecipe -> Recipe : textes assainis ; null si un champ obligatoire devient vide. */
export function toRecipe(raw: RawRecipe): Recipe | null {
  const title = cleanText(raw.title, 100);
  if (!title) return null;
  const ingredients = raw.ingredients
    .map((i) => ({ name: cleanText(i.name, 80), quantity: cleanText(i.quantity, 80) }))
    .filter((i): i is { name: string; quantity: string } => !!i.name && !!i.quantity);
  const steps = raw.steps.map((s) => cleanText(s, 300)).filter((s): s is string => !!s);
  if (ingredients.length === 0 || steps.length === 0) return null;
  const tip = raw.tip ? cleanText(raw.tip, 300) : null;
  return { id: recipeId({ title, ingredients }), title, minutes: raw.minutes, servings: raw.servings, ingredients, steps, tip, glycemic: raw.glycemic ?? null };
}

export type ParsedOutput = { ok: true; recipes: Recipe[] } | { ok: false };

/**
 * Texte du modèle -> recettes. Tolère un éventuel habillage (```json ... ```) en ne gardant que l'objet JSON le plus
 * externe, mais le CONTENU doit respecter le schéma à la lettre : sinon `ok: false` (l'appelant relance UNE fois).
 */
export function parseModelOutput(text: string): ParsedOutput {
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start < 0 || end <= start) return { ok: false };
  let json: unknown;
  try {
    json = JSON.parse(text.slice(start, end + 1));
  } catch {
    return { ok: false };
  }
  const parsed = ModelOutputSchema.safeParse(json);
  if (!parsed.success) return { ok: false };
  const recipes = parsed.data.recipes.map(toRecipe).filter((r): r is Recipe => r !== null);
  return recipes.length > 0 ? { ok: true, recipes } : { ok: false };
}

/** Relecture d'une recette reçue du serveur ou du stockage local (données modifiables : on revalide tout). */
export function parseStoredRecipe(x: unknown): Recipe | null {
  const parsed = RecipeSchema.safeParse(x);
  return parsed.success ? toRecipe(parsed.data) : null;
}
