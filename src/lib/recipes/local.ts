"use client";
import { cleanTags } from "@/lib/sanitize";
import { K_FRIDGE, K_RECIPE_FAVORITES, STORAGE_PREFIX, consentStatus, notifyChange } from "@/lib/storage";
import { cleanIngredientName } from "./input";
import { parseStoredRecipe } from "./schema";
import type { Recipe } from "./types";

/**
 * Données « recettes » stockées UNIQUEMENT sur l'appareil (localStorage), sous le préfixe `hs:v1:` :
 * « Supprimer toutes mes données » les efface donc avec le reste.
 *
 *  - Frigo : persistant seulement avec l'accord d'enregistrement local ; sans accord, il vit en mémoire pour la session.
 *  - Recettes enregistrées : même règle que les favoris (elles découlent des règles du profil) -> accord requis.
 *  - Accord « envoi à un prestataire d'IA » : trace du CHOIX (version + date), comme celle du disclaimer ; écrite sans accord santé.
 *  - Compteur de générations : technique, sans donnée de santé.
 * Tout est revalidé à la relecture (le stockage est modifiable par l'utilisateur).
 */
const K_AI_CONSENT = `${STORAGE_PREFIX}recipes-ai-consent`;
const K_QUOTA = `${STORAGE_PREFIX}recipes-quota`;

/** À incrémenter si le texte de transparence (envoi à un prestataire d'IA) change : l'accord est redemandé. */
export const RECIPES_CONSENT_VERSION = "1";
export const MAX_FRIDGE = 40;
export const MAX_RECIPE_FAVORITES = 50;

function read<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}
function write(key: string, value: unknown): boolean {
  try {
    localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch {
    return false;
  }
}

/* ------------------------------------------------------------------ accord « prestataire d'IA hors UE » */

export function hasRecipeConsent(): boolean {
  return read<{ version?: string }>(K_AI_CONSENT)?.version === RECIPES_CONSENT_VERSION;
}
export function grantRecipeConsent(): void {
  write(K_AI_CONSENT, { version: RECIPES_CONSENT_VERSION, at: new Date().toISOString() });
  notifyChange();
}
export function withdrawRecipeConsent(): void {
  try { localStorage.removeItem(K_AI_CONSENT); } catch { /* ignore */ }
  notifyChange();
}

/* ------------------------------------------------------------------ frigo */

export interface FridgeItem {
  id: string;
  name: string;
  /** Code-barres si l'aliment vient d'un scan. */
  code: string | null;
  /** Tags d'ingrédients du produit scanné (pour vérifier précisément sa compatibilité). */
  tags: string[];
  addedAt: string;
}

let sessionFridge: FridgeItem[] = [];

function parseFridge(raw: unknown): FridgeItem[] {
  if (!Array.isArray(raw)) return [];
  const out: FridgeItem[] = [];
  for (const x of raw.slice(0, MAX_FRIDGE)) {
    if (typeof x !== "object" || x === null) continue;
    const o = x as Record<string, unknown>;
    const name = cleanIngredientName(o.name);
    if (!name || typeof o.id !== "string" || o.id.length > 40) continue;
    out.push({
      id: o.id,
      name,
      code: typeof o.code === "string" && /^\d{8,14}$/.test(o.code) ? o.code : null,
      tags: cleanTags(o.tags).slice(0, 60),
      addedAt: typeof o.addedAt === "string" ? o.addedAt : new Date(0).toISOString(),
    });
  }
  return out;
}

export function getFridge(): FridgeItem[] {
  return consentStatus() === "granted" ? parseFridge(read<unknown>(K_FRIDGE)) : sessionFridge;
}

function saveFridge(items: FridgeItem[]): void {
  const list = items.slice(0, MAX_FRIDGE);
  if (consentStatus() === "granted") write(K_FRIDGE, list);
  else sessionFridge = list;
  notifyChange();
}

export type AddResult = "added" | "duplicate" | "invalid" | "full";

export function addFridgeItem(rawName: unknown, extra: { code?: string | null; tags?: string[] } = {}): AddResult {
  const name = cleanIngredientName(rawName);
  if (!name) return "invalid";
  const items = getFridge();
  if (items.some((i) => i.name.toLocaleLowerCase("fr") === name.toLocaleLowerCase("fr"))) return "duplicate";
  if (items.length >= MAX_FRIDGE) return "full";
  const item: FridgeItem = {
    id: `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`,
    name,
    code: extra.code && /^\d{8,14}$/.test(extra.code) ? extra.code : null,
    tags: cleanTags(extra.tags ?? []).slice(0, 60),
    addedAt: new Date().toISOString(),
  };
  saveFridge([item, ...items]);
  return "added";
}

export function removeFridgeItem(id: string): void {
  saveFridge(getFridge().filter((i) => i.id !== id));
}

/* ------------------------------------------------------------------ recettes enregistrées */

export function getRecipeFavorites(): Recipe[] {
  if (consentStatus() !== "granted") return [];
  const raw = read<unknown>(K_RECIPE_FAVORITES);
  if (!Array.isArray(raw)) return [];
  const out: Recipe[] = [];
  for (const x of raw.slice(0, MAX_RECIPE_FAVORITES)) {
    const r = parseStoredRecipe((x as { recipe?: unknown } | null)?.recipe);
    if (r) out.push(r);
  }
  return out;
}

export function isRecipeFavorite(id: string): boolean {
  return getRecipeFavorites().some((r) => r.id === id);
}

/** "denied" = pas d'accord d'enregistrement local : rien n'est écrit. */
export function toggleRecipeFavorite(recipe: Recipe): "added" | "removed" | "denied" | "full" {
  if (consentStatus() !== "granted") return "denied";
  const favs = getRecipeFavorites();
  let next: Recipe[];
  let result: "added" | "removed" | "full";
  if (favs.some((r) => r.id === recipe.id)) {
    next = favs.filter((r) => r.id !== recipe.id);
    result = "removed";
  } else if (favs.length >= MAX_RECIPE_FAVORITES) {
    return "full";
  } else {
    next = [recipe, ...favs];
    result = "added";
  }
  write(K_RECIPE_FAVORITES, next.map((r) => ({ savedAt: new Date().toISOString(), recipe: r })));
  notifyChange();
  return result;
}

/* ------------------------------------------------------------------ compteur de générations (quota gratuit) */

export interface LocalQuota { month: string; used: number; limit: number | null }

const monthOf = (d: Date) => d.toISOString().slice(0, 7); // UTC, comme le serveur

export function getLocalQuota(now: Date = new Date()): LocalQuota {
  const o = read<Partial<LocalQuota>>(K_QUOTA);
  const month = monthOf(now);
  const knownLimit = typeof o?.limit === "number" && o.limit > 0 ? Math.floor(o.limit) : null;
  // Nouveau mois : le compteur repart de zéro, la limite connue est conservée.
  if (!o || o.month !== month) return { month, used: 0, limit: knownLimit };
  return {
    month,
    used: typeof o.used === "number" && Number.isFinite(o.used) && o.used >= 0 ? Math.floor(o.used) : 0,
    limit: knownLimit,
  };
}

/**
 * Met à jour le compteur après une réponse du serveur. `consumed` = une génération a été décomptée.
 * Le compteur local est un confort d'affichage ; le serveur reste l'autorité (on retient le plus élevé des deux).
 */
export function syncLocalQuota(server: { limit: number; used: number } | null, consumed: boolean, now: Date = new Date()): LocalQuota {
  const cur = getLocalQuota(now);
  const next: LocalQuota = {
    month: cur.month,
    used: Math.max(cur.used + (consumed ? 1 : 0), server?.used ?? 0),
    limit: server?.limit ?? cur.limit,
  };
  write(K_QUOTA, next);
  return next;
}

export function quotaExhausted(q: LocalQuota): boolean {
  return q.limit !== null && q.used >= q.limit;
}
