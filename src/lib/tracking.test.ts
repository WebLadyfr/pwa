import { beforeEach, describe, expect, it } from "vitest";
import { installFakeLocalStorage } from "./testing/local-storage";
import { acceptDisclaimer, getDietMode, setConsent, setDietMode } from "./storage";
import {
  last7Days, bumpScan, dayKey, daysTrackedLast7, getRecipeStatuses, getStats, getSymptoms, noteRecipesGenerated, parseSymptoms,
  saveSymptomEntry, setRecipeStatus, type SymptomEntry,
} from "./tracking";

let store: Map<string, string>;
beforeEach(() => { store = installFakeLocalStorage(); });

const entry = (date: string): SymptomEntry => ({ date, scores: { energy: 3, digestion: 4, mood: 5, sleep: 2, focus: 3 } });

describe("sans accord d'enregistrement : rien n'est écrit", () => {
  it("compteurs, statuts et symptômes ignorés", () => {
    acceptDisclaimer(); setConsent(false);
    bumpScan(); noteRecipesGenerated(["abc"]);
    expect(setRecipeStatus("abc", "tested")).toBe(false);
    expect(saveSymptomEntry(entry("2026-11-14"))).toBe(false);
    expect([...store.keys()].filter((k) => /stats|recipe-status|symptoms|diet/.test(k))).toEqual([]);
    expect(getSymptoms()).toEqual([]);
  });
  it("le régime choisi vit en mémoire pour la session, sans rien écrire", () => {
    acceptDisclaimer(); setConsent(false);
    setDietMode("souple");
    expect(getDietMode()).toBe("souple");
    expect(store.has("hs:v1:diet")).toBe(false);
  });
});

describe("avec accord", () => {
  beforeEach(() => { acceptDisclaimer(); setConsent(true); });

  it("compte les scans et les recettes DISTINCTES générées", () => {
    const day = new Date(2026, 10, 14, 12);
    bumpScan(day); bumpScan(day);
    noteRecipesGenerated(["a1", "b2"], day); noteRecipesGenerated(["a1", "c3"], day);
    expect(getStats()).toEqual({ scans: 2, recipeIds: ["a1", "b2", "c3"], scanDays: { "2026-11-14": 2 }, recipeDays: { "2026-11-14": 3 } });
  });
  it("statut de recette : valeurs validées", () => {
    expect(setRecipeStatus("a1", "approved")).toBe(true);
    expect(setRecipeStatus("a1", "nimporte" as never)).toBe(false);
    expect(getRecipeStatuses()).toEqual({ a1: "approved" });
  });
  it("symptômes : une saisie par jour (remplacée), triées, bornées 1..5", () => {
    expect(saveSymptomEntry(entry("2026-11-13"))).toBe(true);
    expect(saveSymptomEntry(entry("2026-11-14"))).toBe(true);
    expect(saveSymptomEntry({ date: "2026-11-14", scores: { energy: 1, digestion: 1, mood: 1, sleep: 1, focus: 1 } })).toBe(true);
    const all = getSymptoms();
    expect(all.map((e) => e.date)).toEqual(["2026-11-14", "2026-11-13"]);
    expect(all[0]!.scores.energy).toBe(1);
    expect(saveSymptomEntry({ date: "2026-11-15", scores: { energy: 9, digestion: 1, mood: 1, sleep: 1, focus: 1 } })).toBe(false);
  });
  it("retirer l'accord efface tout ce suivi", () => {
    bumpScan(); setRecipeStatus("a1", "tested"); saveSymptomEntry(entry("2026-11-14")); setDietMode("test");
    setConsent(false);
    expect([...store.keys()].filter((k) => /stats|recipe-status|symptoms|diet/.test(k))).toEqual([]);
  });
  it("stockage corrompu : relu sans planter", () => {
    store.set("hs:v1:symptoms", "{pas du json");
    store.set("hs:v1:stats", JSON.stringify({ scans: "beaucoup", recipeIds: [1, "<script>"] }));
    expect(getSymptoms()).toEqual([]);
    expect(getStats()).toEqual({ scans: 0, recipeIds: [], scanDays: {}, recipeDays: {} });
  });
});

describe("helpers de dates", () => {
  it("parseSymptoms rejette les dates et notes invalides", () => {
    expect(parseSymptoms([{ date: "demain", scores: entry("x").scores }])).toEqual([]);
  });
  it("jours suivis sur 7 derniers jours (jour local)", () => {
    const now = new Date(2026, 10, 14, 10, 0, 0);
    const list = [entry(dayKey(now)), entry("2026-11-10"), entry("2026-11-01")];
    expect(daysTrackedLast7(list, now)).toBe(2);
  });
});

describe("histogramme 7 jours", () => {
  it("7 jours, du plus ancien à aujourd'hui, moyenne par jour, null si non renseigné", () => {
    const now = new Date(2026, 10, 14, 10, 0, 0);
    const days = last7Days([entry("2026-11-14"), entry("2026-11-12")], now);
    expect(days).toHaveLength(7);
    expect(days[0]!.key).toBe("2026-11-08");
    expect(days[6]!.key).toBe("2026-11-14");
    expect(days[6]!.avg).toBeCloseTo(3.4); // (3+4+5+2+3)/5
    expect(days[5]!.avg).toBeNull();
  });
});
