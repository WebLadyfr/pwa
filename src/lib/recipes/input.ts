/**
 * Nettoyage des NOMS D'INGRÉDIENTS (venant d'Open Food Facts ou saisis par l'utilisatrice) avant qu'ils
 * n'atteignent le modèle. Partagé client + serveur ; le serveur reste l'autorité.
 *
 * Ces noms sont NON FIABLES (injection de prompt) : liste blanche de caractères, longueur bornée,
 * et rejet des formulations qui ressemblent à une consigne. Ce filtre n'est qu'UNE couche :
 * les noms sont de toute façon transmis comme DONNÉES délimitées, avec ordre d'ignorer toute consigne,
 * et la sortie du modèle est validée puis revérifiée par notre moteur de règles.
 */
import { cleanText } from "@/lib/sanitize";

export const MAX_INGREDIENTS = 15;
export const MAX_NAME_LENGTH = 50;
const MAX_NAME_WORDS = 8;

/** Lettres (toutes langues), chiffres, espace, apostrophes, tiret, virgule, point, esperluette, %, parenthèses, barre oblique. */
const DISALLOWED = /[^\p{L}\p{N} '’\-.,&%()/]/gu;

/** Verbes/noms typiques d'une consigne : un nom d'aliment n'en contient jamais. */
const INSTRUCTION_LIKE =
  /\b(ignore[rz]?|ignorez|oublie[rz]?|disregard|forget|instructions?|consignes?|syst[eè]me|system|prompt|assistant|jailbreak|r[ée]ponds?|r[ée]pondez|reply|respond|json|d[ée]sormais|d[ée]sobéis|override|you are|tu es|vous [êe]tes)\b/i;

export function cleanIngredientName(raw: unknown): string | null {
  if (typeof raw !== "string" || raw.length > 200) return null;
  const s = raw.normalize("NFC").replace(DISALLOWED, " ").replace(/\s+/g, " ").trim();
  if (s.length < 2 || s.length > MAX_NAME_LENGTH) return null;
  if (!/\p{L}{2}/u.test(s)) return null; // au moins deux lettres : pas de « 1234 » ni de ponctuation seule
  if (s.split(" ").length > MAX_NAME_WORDS) return null;
  if (INSTRUCTION_LIKE.test(s)) return null;
  return s;
}

/** Liste nettoyée : noms invalides retirés, doublons (insensibles à la casse) retirés, plafonnée. */
export function cleanIngredientList(raw: unknown, max = MAX_INGREDIENTS): string[] {
  if (!Array.isArray(raw)) return [];
  const seen = new Set<string>();
  const out: string[] = [];
  for (const item of raw.slice(0, 200)) {
    const name = cleanIngredientName(item);
    if (!name) continue;
    const key = name.toLocaleLowerCase("fr");
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(name);
    if (out.length >= max) break;
  }
  return out;
}

/**
 * Nom d'un PRODUIT (Open Food Facts, étiquette) -> nom d'ingrédient propre : texte assaini, coupé entre deux mots
 * pour respecter les limites de longueur et de nombre de mots. null si rien d'utilisable.
 */
export function shortIngredientName(raw: string | null): string | null {
  const text = cleanText(raw, 160);
  if (!text) return null;
  let s = "";
  for (const w of text.split(" ").slice(0, MAX_NAME_WORDS)) {
    const next = s ? `${s} ${w}` : w;
    if (next.length > MAX_NAME_LENGTH) break;
    s = next;
  }
  return cleanIngredientName(s);
}
