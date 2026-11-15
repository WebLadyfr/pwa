/**
 * Utilitaires de texte PURS partagés client + serveur (aucune dépendance navigateur ou Node).
 */

/** Minuscules, sans accents, apostrophes uniformisées : base de TOUTES les comparaisons de ce module. */
export function norm(s: string): string {
  return s
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .replace(/œ/g, "oe")
    .replace(/æ/g, "ae")
    .replace(/[’`]/g, "'");
}

/** Mots entiers (lettres/chiffres), après normalisation. "d'érable" -> ["d", "erable"]. */
export function tokens(s: string): string[] {
  return norm(s).split(/[^\p{L}\p{N}]+/u).filter(Boolean);
}

/** Hash non cryptographique 53 bits (cyrb53) : identifiants stables de recettes, jamais utilisé pour la sécurité. */
export function hash53(str: string, seed = 0): string {
  let h1 = 0xdeadbeef ^ seed;
  let h2 = 0x41c6ce57 ^ seed;
  for (let i = 0; i < str.length; i++) {
    const ch = str.charCodeAt(i);
    h1 = Math.imul(h1 ^ ch, 2654435761);
    h2 = Math.imul(h2 ^ ch, 1597334677);
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
  return (4294967296 * (2097151 & h2) + (h1 >>> 0)).toString(36);
}
