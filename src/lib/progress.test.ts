import { describe, expect, it } from "vitest";
import { milestones, nextGoal, overall, pct, type ProgressInput } from "./progress";

const zero: ProgressInput = { scans: 0, recipesGenerated: 0, savedRecipes: 0, testedRecipes: 0, approvedRecipes: 0, symptomDays7: 0, symptomDaysTotal: 0 };

describe("progression", () => {
  it("palier suivant", () => {
    expect(nextGoal(0)).toBe(5);
    expect(nextGoal(5)).toBe(10);
    expect(nextGoal(49)).toBe(50);
    expect(nextGoal(5000)).toBe(1000); // dernier palier conservé
  });
  it("pourcentage borné, sans division par zéro", () => {
    expect(pct(3, 5)).toBe(60);
    expect(pct(9, 5)).toBe(100);
    expect(pct(-1, 5)).toBe(0);
    expect(pct(1, 0)).toBe(0);
    expect(pct(Number.NaN, 5)).toBe(0);
  });
  it("progression globale : 0 au départ, 100 quand tout est fait", () => {
    expect(overall(zero)).toMatchObject({ done: 0, pct: 0 });
    const all: ProgressInput = { scans: 5, recipesGenerated: 1, savedRecipes: 1, testedRecipes: 1, approvedRecipes: 1, symptomDays7: 5, symptomDaysTotal: 5 };
    expect(overall(all)).toMatchObject({ done: 8, total: 8, pct: 100 });
  });
  it("le suivi des symptômes compte dans la progression globale", () => {
    const m = Object.fromEntries(milestones({ ...zero, symptomDaysTotal: 1 }).map((x) => [x.id, x.done]));
    expect(m.symptoms1).toBe(true);
    expect(m.symptoms5).toBe(false);
  });
});

describe("prochaine étape", () => {
  it("première étape non faite, puis null", async () => {
    const { nextStep } = await import("./progress");
    expect(nextStep(zero)).toBe("scan1");
    expect(nextStep({ ...zero, scans: 1 })).toBe("scan5");
    expect(nextStep({ scans: 5, recipesGenerated: 1, savedRecipes: 1, testedRecipes: 1, approvedRecipes: 1, symptomDays7: 5, symptomDaysTotal: 5 })).toBeNull();
  });
});

import { buildBuckets } from "./progress";

describe("buildBuckets", () => {
  const now = new Date(2026, 10, 14, 15, 0); // 14 nov. 2026
  it("semaine : 7 jours, aujourd'hui en dernier", () => {
    const b = buildBuckets("week", { "2026-11-14": 3, "2026-11-08": 2, "2026-11-07": 9 }, now);
    expect(b).toHaveLength(7);
    expect(b[6]!.key).toBe("2026-11-14");
    expect(b[6]!.value).toBe(3);
    expect(b[0]!.key).toBe("2026-11-08");
    expect(b[0]!.value).toBe(2); // le 7 est hors fenêtre
  });
  it("mois : 5 semaines glissantes", () => {
    const b = buildBuckets("month", { "2026-11-14": 1, "2026-11-08": 1, "2026-11-07": 4, "2026-10-12": 5 }, now);
    expect(b).toHaveLength(5);
    expect(b[4]!.value).toBe(2); // 8 → 14 nov.
    expect(b[3]!.value).toBe(4); // 1 → 7 nov.
    expect(b[0]!.start.getMonth()).toBe(9); // 12 oct. dans la 1re barre
    expect(b[0]!.value).toBe(5);
  });
  it("année : 12 mois civils jusqu'au mois en cours", () => {
    const b = buildBuckets("year", { "2026-11-02": 2, "2026-11-30": 1, "2025-12-15": 7, "2025-11-30": 99 }, now);
    expect(b).toHaveLength(12);
    expect(b[11]!.key).toBe("2026-11");
    expect(b[11]!.value).toBe(3);
    expect(b[0]!.key).toBe("2025-12");
    expect(b[0]!.value).toBe(7); // nov. 2025 est hors fenêtre
  });
  it("sans donnée : que des zéros", () => {
    expect(buildBuckets("year", {}, now).every((x) => x.value === 0)).toBe(true);
  });
});
