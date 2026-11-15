/**
 * Calculs PURS de progression (aucun accès navigateur) : testables, utilisés par le tableau de bord.
 */
export interface ProgressInput {
  scans: number;
  recipesGenerated: number;
  savedRecipes: number;
  testedRecipes: number;
  approvedRecipes: number;
  symptomDays7: number;
  symptomDaysTotal: number;
}

export const GOAL_STEPS = [5, 10, 25, 50, 100, 250, 500, 1000] as const;

/** Prochain palier à atteindre (le dernier palier est conservé au-delà). */
export function nextGoal(n: number, steps: readonly number[] = GOAL_STEPS): number {
  for (const s of steps) if (n < s) return s;
  return steps[steps.length - 1]!;
}

export function pct(value: number, goal: number): number {
  if (!Number.isFinite(value) || !Number.isFinite(goal) || goal <= 0) return 0;
  return Math.max(0, Math.min(100, Math.round((value / goal) * 100)));
}

export interface Milestone { id: string; done: boolean }

/** Étapes de la progression globale (scan, recettes, suivi des symptômes). */
export function milestones(p: ProgressInput): Milestone[] {
  return [
    { id: "scan1", done: p.scans >= 1 },
    { id: "scan5", done: p.scans >= 5 },
    { id: "recipe1", done: p.recipesGenerated >= 1 },
    { id: "saved1", done: p.savedRecipes >= 1 },
    { id: "tested1", done: p.testedRecipes >= 1 },
    { id: "approved1", done: p.approvedRecipes >= 1 },
    { id: "symptoms1", done: p.symptomDaysTotal >= 1 },
    { id: "symptoms5", done: p.symptomDays7 >= 5 },
  ];
}

/** Première étape non accomplie (null si tout est fait). */
export function nextStep(p: ProgressInput): string | null {
  return milestones(p).find((m) => !m.done)?.id ?? null;
}

export function overall(p: ProgressInput): { done: number; total: number; pct: number; items: Milestone[] } {
  const items = milestones(p);
  const done = items.filter((m) => m.done).length;
  return { done, total: items.length, pct: pct(done, items.length), items };
}

/* ------------------------------------------------------------------ séries semaine / mois / année */

export type Period = "week" | "month" | "year";
export interface Bucket { key: string; start: Date; end: Date; value: number }

const pad = (n: number) => String(n).padStart(2, "0");
const key = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const addDays = (d: Date, n: number) => { const x = new Date(d.getFullYear(), d.getMonth(), d.getDate() + n); return x; };

/**
 * Découpe l'historique (jour → nombre) en barres :
 *  - week  : les 7 derniers jours, une barre par jour ;
 *  - month : les 5 dernières semaines glissantes (7 jours chacune, la dernière finit aujourd'hui) ;
 *  - year  : les 12 derniers mois civils, le dernier étant le mois en cours.
 * Fonction pure : dates locales, aucun accès navigateur.
 */
export function buildBuckets(period: Period, perDay: Record<string, number>, now: Date = new Date()): Bucket[] {
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const sum = (from: Date, to: Date) => {
    let t = 0;
    for (let d = from; d <= to; d = addDays(d, 1)) t += perDay[key(d)] ?? 0;
    return t;
  };
  const out: Bucket[] = [];
  if (period === "week") {
    for (let i = 6; i >= 0; i--) {
      const d = addDays(today, -i);
      out.push({ key: key(d), start: d, end: d, value: perDay[key(d)] ?? 0 });
    }
  } else if (period === "month") {
    for (let i = 4; i >= 0; i--) {
      const end = addDays(today, -7 * i);
      const start = addDays(end, -6);
      out.push({ key: key(start), start, end, value: sum(start, end) });
    }
  } else {
    for (let i = 11; i >= 0; i--) {
      const start = new Date(today.getFullYear(), today.getMonth() - i, 1);
      const end = new Date(start.getFullYear(), start.getMonth() + 1, 0);
      out.push({ key: `${start.getFullYear()}-${pad(start.getMonth() + 1)}`, start, end, value: sum(start, end) });
    }
  }
  return out;
}
