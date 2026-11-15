import { z } from "zod";
import { locales } from "@/i18n";
import { GROUP_ID_RE, MAX_GROUPS, MAX_TAGS_PER_GROUP } from "./exclusions";
import { MAX_INGREDIENTS } from "./input";

/**
 * Corps de POST /api/recipes. Schéma STRICT : tout champ inconnu est refusé — en particulier, un client qui enverrait
 * un `profile`, un identifiant ou un diagnostic par erreur est rejeté (400) au lieu d'être silencieusement ignoré.
 */
export const RecipeRequestSchema = z
  .object({
    mode: z.enum(["seed", "list"]),
    /** Mode « scan » : GTIN du produit de départ (le serveur retrouve lui-même son nom). */
    code: z.string().regex(/^\d{8,14}$/).optional(),
    /** Mode « frigo » : noms d'ingrédients (max 15 par demande). */
    ingredients: z.array(z.string().max(200)).max(MAX_INGREDIENTS).optional(),
    exclusions: z
      .object({
        groups: z
          .array(z.object({ id: z.string().regex(GROUP_ID_RE), tags: z.array(z.string().max(100)).max(MAX_TAGS_PER_GROUP) }).strict())
          .max(MAX_GROUPS),
      })
      .strict(),
    /** Version du jeu de règles (clé de cache) : ne permet pas d'identifier un profil. */
    rulesVersion: z.string().regex(/^[A-Za-z0-9._-]{1,40}$/),
    lang: z.string().refine((l) => (locales as readonly string[]).includes(l)),
    /** « Régénérer » : ignore le cache. */
    regenerate: z.boolean().optional(),
  })
  .strict()
  .superRefine((v, ctx) => {
    if (v.mode === "seed" && !v.code) ctx.addIssue({ code: "custom", message: "code requis", path: ["code"] });
    if (v.mode === "seed" && v.ingredients) ctx.addIssue({ code: "custom", message: "ingredients interdit", path: ["ingredients"] });
    if (v.mode === "list" && (!v.ingredients || v.ingredients.length === 0)) ctx.addIssue({ code: "custom", message: "ingredients requis", path: ["ingredients"] });
    if (v.mode === "list" && v.code) ctx.addIssue({ code: "custom", message: "code interdit", path: ["code"] });
  });

export type RecipeRequest = z.infer<typeof RecipeRequestSchema>;
