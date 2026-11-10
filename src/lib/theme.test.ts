import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

/**
 * Vérifie les contrastes WCAG AA des jetons de couleur en lisant le VRAI fichier CSS
 * (pas une copie) : changer une couleur sans vérifier le contraste fait échouer ce test.
 */
const css = readFileSync(path.resolve(import.meta.dirname, "../app/globals.css"), "utf8");

function block(selector: string): Record<string, string> {
  const start = css.indexOf(`${selector} {`);
  if (start < 0) throw new Error(`bloc CSS introuvable : ${selector}`);
  const body = css.slice(start, css.indexOf("}", start));
  const vars: Record<string, string> = {};
  for (const m of body.matchAll(/--([a-z-]+):\s*(#[0-9a-fA-F]{6})\s*;/g)) vars[m[1]!] = m[2]!.toLowerCase();
  return vars;
}

const themes = {
  light: block(":root"),
  dark: block('html[data-theme="dark"]'),
  autoDark: block('html:not([data-theme="light"])'), // dans @media (prefers-color-scheme: dark)
};

function luminance(hex: string): number {
  const [r, g, b] = [1, 3, 5].map((i) => {
    const c = parseInt(hex.slice(i, i + 2), 16) / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  }) as [number, number, number];
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}
function contrast(a: string, b: string): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x) as [number, number];
  return (hi + 0.05) / (lo + 0.05);
}

/** [premier plan, arrière-plan, minimum requis, où c'est utilisé] — 4.5 pour le texte, 3 pour les éléments d'interface. */
const PAIRS: [string, string, number, string][] = [
  ["ink", "canvas", 4.5, "texte courant"],
  ["ink", "surface", 4.5, "texte dans les cartes"],
  ["muted", "canvas", 4.5, "texte secondaire"],
  ["muted", "surface", 4.5, "texte secondaire dans les cartes"],
  ["primary", "canvas", 4.5, "titre de l'app"],
  ["primary", "surface", 4.5, "boutons secondaires, liens, navigation"],
  ["primary", "primary-soft", 4.5, "bouton secondaire survolé, favori actif"],
  ["on-primary", "primary", 4.5, "boutons principaux, onglet actif"],
  ["on-primary", "primary-hover", 4.5, "bouton principal survolé"],
  ["ok-fg", "ok-bg", 4.5, "score vert"],
  ["warn-fg", "warn-bg", 4.5, "score orange, avertissements"],
  ["bad-fg", "bad-bg", 4.5, "score rouge, bouton de suppression"],
  ["ok-fg", "surface", 4.5, "icône/texte positif dans les cartes"],
  ["warn-fg", "surface", 4.5, "icône/texte d'attention dans les cartes"],
  ["bad-fg", "surface", 4.5, "icône/texte négatif dans les cartes"],
  ["bad-fg", "canvas", 4.5, "message d'erreur de saisie"],
  ["warn-fg", "canvas", 4.5, "message d'avertissement hors carte"],
  ["ok-ring", "surface", 3, "bordure du score vert"],
  ["warn-ring", "surface", 3, "bordure du score orange"],
  ["bad-ring", "surface", 3, "bordure du score rouge"],
  ["ok-ring", "ok-bg", 3, "bordure sur fond vert"],
  ["warn-ring", "warn-bg", 3, "bordure sur fond orange"],
  ["bad-ring", "bad-bg", 3, "bordure sur fond rouge"],
  ["line-strong", "surface", 3, "bordure des champs de saisie"],
  ["line-strong", "canvas", 3, "bordure des champs de saisie (fond de page)"],
  ["primary", "surface", 3, "contour de focus / sélection"],
];

describe.each(["light", "dark"] as const)("contrastes WCAG AA — thème %s", (name) => {
  const tokens = themes[name];
  it.each(PAIRS)("%s sur %s ≥ %s:1 (%s)", (fg, bg, min) => {
    expect(tokens[fg], `jeton --${fg} manquant`).toBeDefined();
    expect(tokens[bg], `jeton --${bg} manquant`).toBeDefined();
    expect(contrast(tokens[fg]!, tokens[bg]!)).toBeGreaterThanOrEqual(min);
  });
});

describe("cohérence des thèmes", () => {
  it("le mode automatique (prefers-color-scheme) a exactement les mêmes valeurs que le thème sombre forcé", () => {
    expect(themes.autoDark).toEqual(themes.dark);
  });
  it("clair et sombre définissent les mêmes jetons", () => {
    expect(Object.keys(themes.dark).sort()).toEqual(Object.keys(themes.light).sort());
  });
  it("quatre tailles de texte, toutes en pourcentage (relatives à la taille du navigateur)", () => {
    for (const s of ["small", "normal", "large", "xlarge"]) expect(css).toMatch(new RegExp(`data-text="${s}"\\] \\{ font-size: \\d+(\\.\\d+)?%;`));
  });
});
