"use client";
import { notifyChange } from "./storage";

/**
 * Préférences d'affichage + opt-in aux rapports d'erreur.
 * Données techniques, NON sensibles : enregistrées même sans consentement santé (un thème sombre
 * ne révèle rien). Effacées par « Supprimer toutes mes données » (même préfixe `hs:v1:`).
 * public/theme-init.js lit la MÊME clé avant l'hydratation (pas de flash).
 */
export const PREFS_KEY = "hs:v1:prefs";
export const THEMES = ["auto", "light", "dark"] as const;
export const TEXT_SIZES = ["small", "normal", "large", "xlarge"] as const;
export type ThemePref = (typeof THEMES)[number];
export type TextSize = (typeof TEXT_SIZES)[number];
export interface Prefs { theme: ThemePref; textSize: TextSize; errorReports: boolean }
export const DEFAULT_PREFS: Prefs = { theme: "auto", textSize: "normal", errorReports: false };

export function parsePrefs(raw: unknown): Prefs {
  const o = (typeof raw === "object" && raw !== null ? raw : {}) as Record<string, unknown>;
  return {
    theme: THEMES.includes(o.theme as ThemePref) ? (o.theme as ThemePref) : DEFAULT_PREFS.theme,
    textSize: TEXT_SIZES.includes(o.textSize as TextSize) ? (o.textSize as TextSize) : DEFAULT_PREFS.textSize,
    errorReports: o.errorReports === true, // opt-in : seulement un `true` explicite
  };
}

export function getPrefs(): Prefs {
  try {
    const raw = localStorage.getItem(PREFS_KEY);
    return parsePrefs(raw ? JSON.parse(raw) : null);
  } catch {
    return DEFAULT_PREFS;
  }
}

export function applyPrefs(p: Prefs): void {
  if (typeof document === "undefined") return;
  const d = document.documentElement;
  d.setAttribute("data-theme", p.theme);
  d.setAttribute("data-text", p.textSize);
}

export function setPrefs(patch: Partial<Prefs>): Prefs {
  const next = parsePrefs({ ...getPrefs(), ...patch });
  try { localStorage.setItem(PREFS_KEY, JSON.stringify(next)); } catch { /* ignore */ }
  applyPrefs(next);
  notifyChange();
  return next;
}
