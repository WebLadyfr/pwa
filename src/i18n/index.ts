import fr from "./messages/fr.json";

/**
 * i18n minimale, prête pour l'anglais et l'arabe :
 *  1) créer src/i18n/messages/en.json (mêmes clés que fr.json)
 *  2) l'ajouter à `catalogs` et à `locales`
 *  3) (arabe) ajouter "ar" à RTL_LOCALES : <html dir> est géré dans layout.tsx
 * Les clés manquantes retombent sur le français puis sur la clé elle-même.
 */
export const locales = ["fr"] as const;
export type Locale = (typeof locales)[number];
export const defaultLocale: Locale = "fr";
export const RTL_LOCALES: readonly string[] = ["ar"];

type Catalog = Record<string, string>;
const catalogs: Record<Locale, Catalog> = { fr };

export function t(key: string, vars?: Record<string, string | number>, locale: Locale = defaultLocale): string {
  const raw = catalogs[locale]?.[key] ?? catalogs[defaultLocale][key] ?? key;
  return vars ? raw.replace(/\{(\w+)\}/g, (_, k: string) => String(vars[k] ?? "")) : raw;
}

/** Libellé lisible d'un tag normalisé ("en:glucose-syrup" -> "sirop de glucose"). */
export function tagLabel(tag: string, locale: Locale = defaultLocale): string {
  const known = catalogs[locale]?.[`tag.${tag}`] ?? catalogs[defaultLocale][`tag.${tag}`];
  if (known) return known;
  if (tag.startsWith("nova:")) return `NOVA ${tag.slice(5)}`;
  if (tag.startsWith("nutriment:")) return tag.slice(10).replace(/_100g$/, "").replace(/-/g, " ");
  return tag.replace(/^[a-z]{2,3}:/, "").replace(/-/g, " ");
}
