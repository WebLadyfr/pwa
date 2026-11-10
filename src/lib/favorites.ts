import { evaluate } from "./score/engine";
import type { Level, NormalizedProduct, RuleSet } from "./score/types";

/**
 * Logique PURE des favoris (sans accès navigateur) : testable, et indépendante du moteur.
 * On stocke un instantané du produit (tags normalisés) pour pouvoir RECALCULER le score
 * avec les règles en vigueur à l'ouverture, au lieu de garder un score périmé.
 */
export interface FavoriteComputed {
  at: string; // date du dernier calcul
  ruleSetVersion: string;
  status: "scored" | "insufficient";
  score: number | null;
  level: Level | null;
}

export interface Favorite {
  code: string;
  addedAt: string;
  product: NormalizedProduct;
  computed: FavoriteComputed;
}

export function computeFavorite(product: NormalizedProduct, rs: RuleSet, now: Date = new Date()): FavoriteComputed {
  const r = evaluate(product, rs);
  return r.status === "scored"
    ? { at: now.toISOString(), ruleSetVersion: rs.version, status: "scored", score: r.score, level: r.level }
    : { at: now.toISOString(), ruleSetVersion: rs.version, status: "insufficient", score: null, level: null };
}

/**
 * Recalcule avec les règles actuelles. La date n'est mise à jour QUE si le résultat
 * (version des règles, statut, score, niveau) a changé : elle reste « la date du dernier calcul qui a compté ».
 */
export function refreshFavorite(fav: Favorite, rs: RuleSet, now: Date = new Date()): { fav: Favorite; changed: boolean } {
  const next = computeFavorite(fav.product, rs, now);
  const c = fav.computed;
  const same =
    c.ruleSetVersion === next.ruleSetVersion && c.status === next.status && c.score === next.score && c.level === next.level;
  return same ? { fav, changed: false } : { fav: { ...fav, computed: next }, changed: true };
}

export function refreshAll(favs: Favorite[], rs: RuleSet, now: Date = new Date()): { favs: Favorite[]; changed: boolean } {
  let changed = false;
  const out = favs.map((f) => {
    const r = refreshFavorite(f, rs, now);
    changed ||= r.changed;
    return r.fav;
  });
  return { favs: out, changed };
}
