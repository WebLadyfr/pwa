import fr from "./messages/fr.json";
import en from "./messages/en.json";
import ar from "./messages/ar.json";

/**
 * i18n minimale : français (référence), anglais, arabe (droite à gauche).
 *  - La langue choisie est mémorisée sur l'appareil (clé « hs:v1:lang », préférence d'affichage : pas une donnée de santé).
 *  - `t()` lit la langue au moment de l'appel. Côté serveur, c'est toujours le français : les écrans de l'app ne s'affichent
 *    qu'après le contrôle d'accès côté navigateur (AppGate), donc aucun écart à l'hydratation.
 *  - Les clés manquantes retombent sur le français puis sur la clé elle-même.
 *  - Ajouter une langue : créer messages/<code>.json (mêmes clés), l'ajouter à `catalogs`, `locales` et LOCALE_NAMES.
 */
export const locales = ["fr", "en", "ar"] as const;
export type Locale = (typeof locales)[number];
export const defaultLocale: Locale = "fr";
export const RTL_LOCALES: readonly string[] = ["ar"];
/** Nom de chaque langue DANS sa propre langue (pour que chacun la reconnaisse). */
export const LOCALE_NAMES: Record<Locale, string> = { fr: "Français", en: "English", ar: "العربية" };
const DATE_LOCALES: Record<Locale, string> = { fr: "fr-FR", en: "en-GB", ar: "ar" };
export const LANG_KEY = "hs:v1:lang";

type Catalog = Record<string, string>;
const catalogs: Record<Locale, Catalog> = { fr, en, ar };

let current: Locale | null = null;

function isLocale(v: unknown): v is Locale {
  return typeof v === "string" && (locales as readonly string[]).includes(v);
}

/** Langue active (français côté serveur ; côté navigateur : choix mémorisé). */
export function getLocale(): Locale {
  if (typeof window === "undefined") return defaultLocale;
  if (current) return current;
  try {
    const stored = localStorage.getItem(LANG_KEY);
    current = isLocale(stored) ? stored : defaultLocale;
  } catch {
    current = defaultLocale;
  }
  return current;
}

/** Applique langue et sens de lecture à <html>. */
export function applyDocumentLocale(l: Locale): void {
  if (typeof document === "undefined") return;
  document.documentElement.lang = l;
  document.documentElement.dir = RTL_LOCALES.includes(l) ? "rtl" : "ltr";
}

/** Mémorise la langue et recharge la page (tous les textes sont relus dans la nouvelle langue). */
export function setLocale(l: Locale): void {
  if (!isLocale(l) || typeof window === "undefined") return;
  current = l;
  try { localStorage.setItem(LANG_KEY, l); } catch { /* stockage indisponible : valable pour cette session */ }
  applyDocumentLocale(l);
  window.location.reload();
}

export function dateLocale(): string {
  return DATE_LOCALES[getLocale()];
}

export function t(key: string, vars?: Record<string, string | number>, locale: Locale = getLocale()): string {
  const raw = catalogs[locale]?.[key] ?? catalogs[defaultLocale][key] ?? key;
  return vars ? raw.replace(/\{(\w+)\}/g, (_, k: string) => String(vars[k] ?? "")) : raw;
}

/** Libellé lisible d'un tag normalisé ("en:glucose-syrup" -> "sirop de glucose"). */
export function tagLabel(tag: string, locale: Locale = getLocale()): string {
  const known = catalogs[locale]?.[`tag.${tag}`] ?? catalogs[defaultLocale][`tag.${tag}`];
  if (known) return known;
  if (tag.startsWith("nova:")) return `NOVA ${tag.slice(5)}`;
  if (tag.startsWith("nutriment:")) return tag.slice(10).replace(/_100g$/, "").replace(/-/g, " ");
  return tag.replace(/^[a-z]{2,3}:/, "").replace(/-/g, " ");
}
