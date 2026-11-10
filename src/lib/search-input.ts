/**
 * Validation STRICTE du terme de recherche (partagée client + serveur ; le serveur est l'autorité).
 * L'API de recherche d'Open Food Facts interprète une syntaxe de requête (champ:valeur, *, "", ~, ( ) ...) :
 * la liste blanche ci-dessous interdit tout ce qui permettrait de la détourner (requêtes coûteuses, champs internes).
 */
export const MIN_QUERY = 2;
export const MAX_QUERY = 60;
const MAX_RAW = 200;
/** Lettres (toutes langues), chiffres, espace, apostrophes, tiret, esperluette, point. */
const ALLOWED = /^[\p{L}\p{N} '’\-&.]+$/u;
const OPERATORS = new Set(["and", "or", "not"]);

export type QueryCheck = { ok: true; q: string } | { ok: false; reason: "type" | "short" | "long" | "chars" };

export function normalizeQuery(raw: unknown): QueryCheck {
  if (typeof raw !== "string") return { ok: false, reason: "type" };
  if (raw.length > MAX_RAW) return { ok: false, reason: "long" };
  const s = raw.normalize("NFC").replace(/\s+/g, " ").trim();
  if (!ALLOWED.test(s) && s.length > 0) return { ok: false, reason: "chars" };
  // Neutralise les opérateurs de requête qui passeraient la liste blanche : "-mot", AND/OR/NOT.
  const q = s
    .split(" ")
    .map((w) => w.replace(/^-+/, ""))
    .filter((w) => w.length > 0 && !OPERATORS.has(w.toLowerCase()))
    .join(" ");
  const len = [...q].length;
  if (len < MIN_QUERY) return { ok: false, reason: "short" };
  if (len > MAX_QUERY) return { ok: false, reason: "long" };
  return { ok: true, q };
}

/** Forme envoyée à Open Food Facts (les apostrophes deviennent des espaces : simples séparateurs de mots). */
export function toOffQuery(q: string): string {
  return q.replace(/['’]/g, " ").replace(/\s+/g, " ").trim();
}
