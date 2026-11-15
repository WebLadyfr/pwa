"use client";
import {
  K_RECIPE_STATUS, K_STATS, K_SYMPTOMS, consentStatus, notifyChange,
} from "./storage";

/**
 * Suivi d'usage et de ressenti, stocké UNIQUEMENT sur l'appareil et SEULEMENT avec l'accord d'enregistrement local
 * (ce sont des données de santé : symptômes, statut des recettes testées). Retrait de l'accord = effacement (voir storage.ts).
 * Tout est revalidé à la relecture (le stockage est modifiable par l'utilisateur).
 */

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
const granted = () => consentStatus() === "granted";

/* ------------------------------------------------------------------ compteurs (scans, recettes générées) */

export interface Stats {
  scans: number;
  recipeIds: string[];
  /** Historique par jour (AAAA-MM-JJ → nombre), pour les vues semaine / mois / année. */
  scanDays: Record<string, number>;
  recipeDays: Record<string, number>;
}
const MAX_RECIPE_IDS = 500;
const MAX_DAYS = 400;
const ID_RE = /^[A-Za-z0-9_-]{1,40}$/;
const DAY_RE = /^\d{4}-\d{2}-\d{2}$/;

function cleanDays(v: unknown): Record<string, number> {
  const out: Record<string, number> = {};
  if (typeof v !== "object" || v === null || Array.isArray(v)) return out;
  const entries = Object.entries(v as Record<string, unknown>)
    .filter(([k, n]) => DAY_RE.test(k) && typeof n === "number" && Number.isFinite(n) && n > 0)
    .sort(([a], [b]) => (a < b ? 1 : -1))
    .slice(0, MAX_DAYS);
  for (const [k, n] of entries) out[k] = Math.min(Math.floor(n as number), 100_000);
  return out;
}

export function getStats(): Stats {
  if (!granted()) return { scans: 0, recipeIds: [], scanDays: {}, recipeDays: {} };
  const o = (read<Record<string, unknown>>(K_STATS) ?? {}) as Record<string, unknown>;
  const scans = typeof o.scans === "number" && Number.isFinite(o.scans) && o.scans >= 0 ? Math.min(Math.floor(o.scans), 1_000_000) : 0;
  const ids = Array.isArray(o.recipeIds) ? o.recipeIds.filter((x): x is string => typeof x === "string" && ID_RE.test(x)) : [];
  return { scans, recipeIds: [...new Set(ids)].slice(0, MAX_RECIPE_IDS), scanDays: cleanDays(o.scanDays), recipeDays: cleanDays(o.recipeDays) };
}

export function bumpScan(now: Date = new Date()): void {
  if (!granted()) return;
  const s = getStats();
  const k = dayKey(now);
  write(K_STATS, { ...s, scans: s.scans + 1, scanDays: cleanDays({ ...s.scanDays, [k]: (s.scanDays[k] ?? 0) + 1 }) });
  notifyChange();
}

/** Compte les recettes DISTINCTES générées (par identifiant) : regénérer ou rouvrir la même ne gonfle pas le compteur. */
export function noteRecipesGenerated(ids: string[], now: Date = new Date()): void {
  if (!granted()) return;
  const s = getStats();
  const set = new Set(s.recipeIds);
  let added = 0;
  for (const id of ids) if (ID_RE.test(id) && !set.has(id)) { set.add(id); added++; }
  if (added === 0) return;
  const k = dayKey(now);
  write(K_STATS, { ...s, recipeIds: [...set].slice(-MAX_RECIPE_IDS), recipeDays: cleanDays({ ...s.recipeDays, [k]: (s.recipeDays[k] ?? 0) + added }) });
  notifyChange();
}

/* ------------------------------------------------------------------ statut des recettes enregistrées */

export const RECIPE_STATUSES = ["to_test", "tested", "approved"] as const;
export type RecipeStatus = (typeof RECIPE_STATUSES)[number];
const MAX_STATUS = 200;

export function getRecipeStatuses(): Record<string, RecipeStatus> {
  if (!granted()) return {};
  const o = read<unknown>(K_RECIPE_STATUS);
  const out: Record<string, RecipeStatus> = {};
  if (typeof o !== "object" || o === null || Array.isArray(o)) return out;
  for (const [id, v] of Object.entries(o).slice(0, MAX_STATUS)) {
    if (ID_RE.test(id) && RECIPE_STATUSES.includes(v as RecipeStatus)) out[id] = v as RecipeStatus;
  }
  return out;
}

export function setRecipeStatus(id: string, status: RecipeStatus): boolean {
  if (!granted() || !ID_RE.test(id) || !RECIPE_STATUSES.includes(status)) return false;
  const all = getRecipeStatuses();
  all[id] = status;
  const ok = write(K_RECIPE_STATUS, all);
  notifyChange();
  return ok;
}

/* ------------------------------------------------------------------ suivi des symptômes */

export const SYMPTOM_KEYS = ["energy", "digestion", "mood", "sleep", "focus"] as const;
export type SymptomKey = (typeof SYMPTOM_KEYS)[number];
/** 1 = très difficile, 5 = très bien. */
export interface SymptomEntry { date: string; scores: Record<SymptomKey, number> }
export const MAX_SYMPTOM_DAYS = 366;
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

/** Date locale AAAA-MM-JJ (le jour de l'utilisatrice, pas le jour UTC). */
export function dayKey(d: Date = new Date()): string {
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

export function parseSymptoms(raw: unknown): SymptomEntry[] {
  if (!Array.isArray(raw)) return [];
  const byDate = new Map<string, SymptomEntry>();
  for (const x of raw.slice(0, MAX_SYMPTOM_DAYS * 2)) {
    if (typeof x !== "object" || x === null) continue;
    const o = x as Record<string, unknown>;
    if (typeof o.date !== "string" || !DATE_RE.test(o.date)) continue;
    const sc = (typeof o.scores === "object" && o.scores !== null ? o.scores : {}) as Record<string, unknown>;
    const scores = {} as Record<SymptomKey, number>;
    let ok = true;
    for (const k of SYMPTOM_KEYS) {
      const v = sc[k];
      if (typeof v !== "number" || !Number.isInteger(v) || v < 1 || v > 5) { ok = false; break; }
      scores[k] = v;
    }
    if (ok) byDate.set(o.date, { date: o.date, scores });
  }
  return [...byDate.values()].sort((a, b) => (a.date < b.date ? 1 : -1)).slice(0, MAX_SYMPTOM_DAYS);
}

export function getSymptoms(): SymptomEntry[] {
  return granted() ? parseSymptoms(read<unknown>(K_SYMPTOMS)) : [];
}

/** Enregistre (ou remplace) la saisie d'un jour. false = pas d'accord d'enregistrement ou saisie invalide. */
export function saveSymptomEntry(entry: SymptomEntry): boolean {
  if (!granted()) return false;
  const [clean] = parseSymptoms([entry]);
  if (!clean) return false;
  const rest = getSymptoms().filter((e) => e.date !== clean.date);
  const ok = write(K_SYMPTOMS, [clean, ...rest].slice(0, MAX_SYMPTOM_DAYS));
  notifyChange();
  return ok;
}

/** Les 7 derniers jours (du plus ancien à aujourd'hui) avec le score moyen saisi (null = jour non renseigné). */
export function last7Days(entries: SymptomEntry[], now: Date = new Date()): { key: string; date: Date; avg: number | null }[] {
  const byDate = new Map(entries.map((e) => [e.date, e]));
  const out: { key: string; date: Date; avg: number | null }[] = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    const key = dayKey(d);
    const e = byDate.get(key);
    const avg = e ? SYMPTOM_KEYS.reduce((s, k) => s + e.scores[k], 0) / SYMPTOM_KEYS.length : null;
    out.push({ key, date: d, avg });
  }
  return out;
}

/** Nombre de jours renseignés parmi les 7 derniers jours (aujourd'hui inclus). */
export function daysTrackedLast7(entries: SymptomEntry[], now: Date = new Date()): number {
  const keys = new Set<string>();
  for (let i = 0; i < 7; i++) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    keys.add(dayKey(d));
  }
  return entries.filter((e) => keys.has(e.date)).length;
}
