import { describe, expect, it } from "vitest";
import { PROFILES } from "@rules/index";
import { evaluate } from "./engine";
import { mergeRuleSets } from "./merge";
import type { NormalizedProduct } from "./types";

const prod = (o: Partial<NormalizedProduct>): NormalizedProduct => ({
  code: null, name: null, brands: null, imageUrl: null, ingredientsTags: ["en:water"], additivesTags: [], allergensTags: [],
  tracesTags: [], labelsTags: [], categoriesTags: [], novaGroup: null, nutriments: {}, ...o,
});

describe("mergeRuleSets", () => {
  it("un seul profil : inchangé", () => {
    expect(mergeRuleSets([PROFILES.hashimoto!])).toBe(PROFILES.hashimoto);
  });
  it("une règle commune n'est comptée qu'une fois, au plus strict", () => {
    const m = mergeRuleSets([PROFILES.hashimoto!, PROFILES.coeliaque!]);
    const gluten = m.rules.filter((r) => r.id === "gluten");
    expect(gluten).toHaveLength(1);
    expect(gluten[0]!.points).toBe(-45);
    expect(gluten[0]!.forceMaxLevel).toBe("red");
    expect(gluten[0]!.profiles).toEqual(["hashimoto", "coeliaque"]);
  });
  it("ids uniques après fusion de tous les profils", () => {
    const m = mergeRuleSets(Object.values(PROFILES));
    const ids = m.rules.map((r) => r.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
  it("le produit est mauvais si l'un OU l'autre profil le déconseille", () => {
    const alfalfa = prod({ ingredientsTags: ["en:alfalfa", "en:water"] });
    const h = evaluate(alfalfa, PROFILES.hashimoto!);
    const m = evaluate(alfalfa, mergeRuleSets([PROFILES.hashimoto!, PROFILES.lupus!]));
    expect(h.status === "scored" && h.reasons.some((r) => r.ruleId === "alfalfa")).toBe(false);
    expect(m.status === "scored" && m.reasons.some((r) => r.ruleId === "alfalfa" && r.profiles?.includes("lupus"))).toBe(true);
  });
  it("cœliaque : gluten donne rouge", () => {
    const r = evaluate(prod({ ingredientsTags: ["en:wheat"] }), PROFILES.coeliaque!);
    expect(r.status === "scored" && r.level).toBe("red");
  });
  it("le profil et la version dépendent de la combinaison", () => {
    const m = mergeRuleSets([PROFILES.hashimoto!, PROFILES.lupus!]);
    expect(m.profile).toBe("hashimoto+lupus");
    expect(m.version).toContain("lupus@");
    expect(m.validation.status).toBe("DRAFT");
  });
});
