"use client";
import { computeFavorite, type Favorite, type FavoriteComputed } from "./favorites";
import { normalizeProductShape } from "./sanitize";
import type { Level, NormalizedProduct, RuleSet } from "./score/types";

/**
 * Stockage LOCAL uniquement (localStorage). Rien n'est envoyé à un serveur.
 *
 * Le profil « Hashimoto », l'historique et les favoris révèlent une donnée de santé
 * (art. 9 RGPD) : RIEN de cela n'est écrit tant que l'utilisateur n'a pas explicitement accepté.
 * Exceptions volontaires, non sensibles et strictement techniques :
 *   - l'enregistrement du choix lui-même (consentement ou refus + version des textes) ;
 *   - l'acceptation du disclaimer ;
 *   - les préférences d'affichage / de rapports d'erreur (voir prefs.ts).
 */
const P = "hs:v1:";
const K_CONSENT = `${P}consent`;
const K_DISCLAIMER = `${P}disclaimer`;
const K_PROFILE = `${P}profile`;
const K_HISTORY = `${P}history`;
const K_FAVORITES = `${P}favorites`;

/** À incrémenter dès que la politique de confidentialité ou le texte de consentement change : le consentement est redemandé. */
export const POLICY_VERSION = "2026-11-draft-2";
/** À incrémenter si le texte du disclaimer change. */
export const DISCLAIMER_VERSION = "1";
export const DEFAULT_PROFILE_ID = "hashimoto";
const MAX_HISTORY = 100;
export const MAX_FAVORITES = 200;
export const CHANGE_EVENT = "hs:change";

export type ConsentStatus = "granted" | "refused" | "unknown";
export interface ConsentRecord { status: "granted" | "refused"; at: string; policyVersion: string }
export interface HistoryEntry {
  id: string;
  source: "barcode" | "label";
  code: string | null;
  name: string | null;
  brands: string | null;
  status: "scored" | "insufficient";
  score: number | null;
  level: Level | null;
  at: string;
}

/* ------------------------------------------------------------------ bas niveau */

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
    return false; // stockage plein / bloqué : l'app reste utilisable
  }
}
function remove(key: string) {
  try { localStorage.removeItem(key); } catch { /* ignore */ }
}
/** Prévient les composants (garde d'onboarding, boutons cœur...) qu'un état local a changé. */
export function notifyChange() {
  if (typeof window !== "undefined") window.dispatchEvent(new Event(CHANGE_EVENT));
}

/* ------------------------------------------------------------------ disclaimer + consentement */

export function acceptDisclaimer(): void {
  write(K_DISCLAIMER, { version: DISCLAIMER_VERSION, at: new Date().toISOString() });
  notifyChange();
}
export function disclaimerAccepted(): boolean {
  return read<{ version?: string }>(K_DISCLAIMER)?.version === DISCLAIMER_VERSION;
}

export function getConsent(): ConsentRecord | null {
  const c = read<ConsentRecord>(K_CONSENT);
  return c && (c.status === "granted" || c.status === "refused") && typeof c.at === "string" ? c : null;
}

/** Un consentement donné pour une ANCIENNE version des textes ne vaut plus : on le traite comme « unknown ». */
export function consentStatus(): ConsentStatus {
  const c = getConsent();
  return c && c.policyVersion === POLICY_VERSION ? c.status : "unknown";
}

/** true => il faut (re)passer par l'onboarding avant d'accéder à l'app. */
export function needsOnboarding(): boolean {
  return !disclaimerAccepted() || consentStatus() === "unknown";
}

let sessionProfile: string | null = null; // profil « en session » quand rien n'est sauvegardé (mémoire uniquement)
const PROFILE_ID_RE = /^[a-z0-9_-]{1,32}$/;

/**
 * Enregistre le choix. granted=true : profil + consentement écrits sur l'appareil.
 * granted=false : on n'écrit que le refus ; profil et données déjà présentes sont effacés,
 * le profil choisi n'existe plus qu'en mémoire (session).
 */
export function setConsent(granted: boolean, profileId: string = getProfileId()): void {
  const id = PROFILE_ID_RE.test(profileId) ? profileId : DEFAULT_PROFILE_ID;
  write(K_CONSENT, { status: granted ? "granted" : "refused", at: new Date().toISOString(), policyVersion: POLICY_VERSION } satisfies ConsentRecord);
  if (granted) {
    write(K_PROFILE, { id, createdAt: new Date().toISOString() });
    sessionProfile = null;
  } else {
    purgeHealthData();
    sessionProfile = id;
  }
  notifyChange();
}

function purgeHealthData(): void {
  remove(K_PROFILE);
  remove(K_HISTORY);
  remove(K_FAVORITES);
}

export function getProfileId(): string {
  if (consentStatus() === "granted") {
    const id = read<{ id?: string }>(K_PROFILE)?.id;
    if (typeof id === "string" && PROFILE_ID_RE.test(id)) return id;
  }
  return sessionProfile ?? DEFAULT_PROFILE_ID;
}

/* ------------------------------------------------------------------ historique */

export function getHistory(): HistoryEntry[] {
  if (consentStatus() !== "granted") return [];
  const h = read<unknown>(K_HISTORY);
  if (!Array.isArray(h)) return [];
  // Les données locales sont aussi revalidées à la lecture (stockage modifiable par l'utilisateur).
  return h.filter(isEntry).slice(0, MAX_HISTORY);
}

function isEntry(x: unknown): x is HistoryEntry {
  if (typeof x !== "object" || x === null) return false;
  const e = x as Record<string, unknown>;
  return (
    typeof e.id === "string" &&
    (e.source === "barcode" || e.source === "label") &&
    (e.status === "scored" || e.status === "insufficient") &&
    typeof e.at === "string" &&
    (e.score === null || typeof e.score === "number") &&
    (e.level === null || e.level === "green" || e.level === "orange" || e.level === "red")
  );
}

/** N'écrit que si le consentement est « granted ». Retourne true si enregistré. */
export function addHistory(entry: Omit<HistoryEntry, "id" | "at">): boolean {
  if (consentStatus() !== "granted") return false;
  const now = new Date().toISOString();
  const e: HistoryEntry = { ...entry, id: `${now}-${Math.random().toString(36).slice(2, 8)}`, at: now };
  const rest = getHistory().filter((h) => !(e.code && h.code === e.code));
  return write(K_HISTORY, [e, ...rest].slice(0, MAX_HISTORY));
}

export function clearHistory(): void {
  remove(K_HISTORY);
}

/* ------------------------------------------------------------------ favoris */

function parseComputed(c: unknown): FavoriteComputed {
  const o = (typeof c === "object" && c !== null ? c : {}) as Record<string, unknown>;
  const level = o.level === "green" || o.level === "orange" || o.level === "red" ? o.level : null;
  const status = o.status === "scored" && typeof o.score === "number" && level ? "scored" : "insufficient";
  return {
    at: typeof o.at === "string" ? o.at : new Date(0).toISOString(),
    // version vide => sera recalculé à la prochaine ouverture
    ruleSetVersion: typeof o.ruleSetVersion === "string" ? o.ruleSetVersion : "",
    status,
    score: status === "scored" ? (o.score as number) : null,
    level: status === "scored" ? level : null,
  };
}

export function getFavorites(): Favorite[] {
  if (consentStatus() !== "granted") return [];
  const raw = read<unknown>(K_FAVORITES);
  if (!Array.isArray(raw)) return [];
  const out: Favorite[] = [];
  for (const f of raw.slice(0, MAX_FAVORITES)) {
    if (typeof f !== "object" || f === null) continue;
    const o = f as Record<string, unknown>;
    const product = normalizeProductShape(o.product);
    if (!product || !product.code || typeof o.code !== "string" || o.code !== product.code) continue;
    out.push({ code: product.code, addedAt: typeof o.addedAt === "string" ? o.addedAt : new Date(0).toISOString(), product, computed: parseComputed(o.computed) });
  }
  return out;
}

export function saveFavorites(favs: Favorite[]): boolean {
  if (consentStatus() !== "granted") return false;
  const ok = write(K_FAVORITES, favs.slice(0, MAX_FAVORITES));
  notifyChange();
  return ok;
}

export function isFavorite(code: string | null): boolean {
  return !!code && getFavorites().some((f) => f.code === code);
}

/** "denied" = pas de consentement : rien n'est écrit. */
export function toggleFavorite(product: NormalizedProduct, rs: RuleSet): "added" | "removed" | "denied" {
  if (consentStatus() !== "granted" || !product.code) return "denied";
  const favs = getFavorites();
  if (favs.some((f) => f.code === product.code)) {
    saveFavorites(favs.filter((f) => f.code !== product.code));
    return "removed";
  }
  const now = new Date();
  saveFavorites([{ code: product.code, addedAt: now.toISOString(), product, computed: computeFavorite(product, rs, now) }, ...favs]);
  return "added";
}

export function removeFavorite(code: string): void {
  saveFavorites(getFavorites().filter((f) => f.code !== code));
}

/** Met à jour l'instantané d'un favori avec des données produit fraîches (sans toucher à addedAt). */
export function updateFavoriteSnapshot(product: NormalizedProduct, rs: RuleSet): void {
  if (!product.code) return;
  const favs = getFavorites();
  const i = favs.findIndex((f) => f.code === product.code);
  if (i < 0) return;
  favs[i] = { ...favs[i]!, product, computed: computeFavorite(product, rs) };
  saveFavorites(favs);
}

/* ------------------------------------------------------------------ suppression totale */

let deletedNotice = false;
export function consumeDeletedNotice(): boolean {
  const v = deletedNotice;
  deletedNotice = false;
  return v;
}

/**
 * « Supprimer toutes mes données » : TOUT ce qui commence par `hs:v1:` (consentement, disclaimer, profil,
 * historique, favoris, préférences, choix de rapports d'erreur), caches du service worker, enregistrement SW.
 */
export async function deleteAllData(): Promise<void> {
  try {
    Object.keys(localStorage).filter((k) => k.startsWith(P)).forEach((k) => localStorage.removeItem(k));
  } catch { /* ignore */ }
  sessionProfile = null;
  deletedNotice = true;
  try {
    if ("caches" in window) await Promise.all((await caches.keys()).map((k) => caches.delete(k)));
  } catch { /* ignore */ }
  try {
    if ("serviceWorker" in navigator) await Promise.all((await navigator.serviceWorker.getRegistrations()).map((r) => r.unregister()));
  } catch { /* ignore */ }
  notifyChange();
}
