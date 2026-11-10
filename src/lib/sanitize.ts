import type { NormalizedProduct } from "./score/types";

/**
 * Toute donnée venant d'Open Food Facts OU de l'IA est NON FIABLE (OWASP A03/A08).
 * On ne garde que des formes strictement validées ; le reste est jeté.
 * (Côté rendu, React échappe le texte ; aucun dangerouslySetInnerHTML dans le projet.)
 */

const TAG_RE = /^[a-z]{2,3}:[a-z0-9-]{1,80}$/;
const MAX_TAGS = 200;
const OFF_IMAGE_HOSTS = new Set(["images.openfoodfacts.org", "images.openfoodfacts.net", "static.openfoodfacts.org"]);

export function cleanTags(v: unknown): string[] {
  if (!Array.isArray(v)) return [];
  const out = new Set<string>();
  for (const t of v) {
    if (typeof t === "string" && TAG_RE.test(t)) out.add(t);
    if (out.size >= MAX_TAGS) break;
  }
  return [...out];
}

/** Texte libre : retire caractères de contrôle, tronque. Pas de HTML interprété nulle part. */
export function cleanText(v: unknown, max = 160): string | null {
  if (typeof v !== "string") return null;
  // eslint-disable-next-line no-control-regex
  const s = v.replace(/[\u0000-\u001f\u007f<>]/g, " ").replace(/\s+/g, " ").trim().slice(0, max);
  return s.length > 0 ? s : null;
}

export function cleanImageUrl(v: unknown): string | null {
  if (typeof v !== "string" || v.length > 300) return null;
  try {
    const u = new URL(v);
    return u.protocol === "https:" && OFF_IMAGE_HOSTS.has(u.hostname) ? u.toString() : null;
  } catch {
    return null;
  }
}

const NUTRIMENT_KEYS = [
  "sugars_100g", "fiber_100g", "selenium_100g", "zinc_100g", "omega-3-fat_100g",
  "salt_100g", "proteins_100g", "fat_100g", "saturated-fat_100g", "carbohydrates_100g", "iodine_100g",
];

export function cleanNutriments(v: unknown): Record<string, number> {
  const out: Record<string, number> = {};
  if (typeof v !== "object" || v === null) return out;
  const src = v as Record<string, unknown>;
  for (const k of NUTRIMENT_KEYS) {
    const n = src[k];
    if (typeof n === "number" && Number.isFinite(n) && n >= 0 && n <= 1000) out[k] = n;
  }
  return out;
}

export function cleanNova(v: unknown): 1 | 2 | 3 | 4 | null {
  return v === 1 || v === 2 || v === 3 || v === 4 ? v : null;
}

/** Champs OFF demandés (limite aussi le volume de données reçues). */
export const OFF_FIELDS = [
  "code", "product_name", "product_name_fr", "brands", "image_front_small_url",
  "ingredients_tags", "additives_tags", "allergens_tags", "traces_tags", "labels_tags",
  "categories_tags", "nova_group", "nutriments",
].join(",");

/** Convertit un produit OFF brut (non fiable) en NormalizedProduct. */
export function mapOffProduct(raw: unknown): NormalizedProduct {
  const p = (typeof raw === "object" && raw !== null ? raw : {}) as Record<string, unknown>;
  return {
    code: typeof p.code === "string" && /^\d{8,14}$/.test(p.code) ? p.code : null,
    name: cleanText(p.product_name_fr) ?? cleanText(p.product_name),
    brands: cleanText(Array.isArray(p.brands) ? p.brands.filter((b) => typeof b === "string").slice(0, 3).join(", ") : p.brands, 80),
    imageUrl: cleanImageUrl(p.image_front_small_url),
    ingredientsTags: cleanTags(p.ingredients_tags),
    additivesTags: cleanTags(p.additives_tags),
    allergensTags: cleanTags(p.allergens_tags),
    tracesTags: cleanTags(p.traces_tags),
    labelsTags: cleanTags(p.labels_tags),
    categoriesTags: cleanTags(p.categories_tags),
    novaGroup: cleanNova(p.nova_group),
    nutriments: cleanNutriments(p.nutriments),
  };
}

/**
 * Revalide un produit déjà normalisé (réponse de NOTRE API ou donnée relue du stockage local) :
 * même avec une source "de confiance", on ne garde que des formes strictement validées.
 */
export function normalizeProductShape(p: unknown): NormalizedProduct | null {
  if (typeof p !== "object" || p === null) return null;
  const o = p as Record<string, unknown>;
  return {
    code: typeof o.code === "string" && /^\d{8,14}$/.test(o.code) ? o.code : null,
    name: cleanText(o.name),
    brands: cleanText(o.brands, 80),
    imageUrl: cleanImageUrl(o.imageUrl),
    ingredientsTags: cleanTags(o.ingredientsTags),
    additivesTags: cleanTags(o.additivesTags),
    allergensTags: cleanTags(o.allergensTags),
    tracesTags: cleanTags(o.tracesTags),
    labelsTags: cleanTags(o.labelsTags),
    categoriesTags: cleanTags(o.categoriesTags),
    novaGroup: cleanNova(o.novaGroup),
    nutriments: cleanNutriments(o.nutriments),
  };
}
