import { describe, expect, it } from "vitest";
import { defaultRuleSet as rs } from "@rules/index";
import { applyDietMode, parseDietMode } from "./diet";
import { evaluate } from "./score/engine";
import type { NormalizedProduct } from "./score/types";

const p = (over: Partial<NormalizedProduct>): NormalizedProduct => ({
  code: "1", name: "x", brands: null, imageUrl: null, ingredientsTags: ["en:rice"], additivesTags: [], allergensTags: [],
  tracesTags: [], labelsTags: [], categoriesTags: [], novaGroup: null, nutriments: {}, ...over,
});

describe("modes de régime", () => {
  it("valeur inconnue => strict", () => {
    expect(parseDietMode("n'importe quoi")).toBe("strict");
    expect(parseDietMode(undefined)).toBe("strict");
    expect(parseDietMode("souple")).toBe("souple");
  });
  it("strict et test : règles inchangées (même objet)", () => {
    expect(applyDietMode(rs, "strict")).toBe(rs);
    expect(applyDietMode(rs, "test")).toBe(rs);
  });
  it("souple : seuils abaissés, version distincte (les favoris sont recalculés), règles intactes", () => {
    const s = applyDietMode(rs, "souple");
    expect(s.version).not.toBe(rs.version);
    expect(s.scoring.thresholds.green).toBeLessThan(rs.scoring.thresholds.green);
    expect(s.rules).toBe(rs.rules);
    expect(rs.scoring.thresholds.green).toBe(65); // l'original n'est pas modifié
  });
  it("un produit limite passe de orange à vert en mode souple, jamais l'inverse", () => {
    const prod = p({ ingredientsTags: ["en:rice", "en:sugar"] });
    const strict = evaluate(prod, rs);
    const souple = evaluate(prod, applyDietMode(rs, "souple"));
    expect(strict.status).toBe("scored");
    expect(souple.status).toBe("scored");
    if (strict.status === "scored" && souple.status === "scored") {
      expect(souple.score).toBe(strict.score);
      const rank = { red: 0, orange: 1, green: 2 } as const;
      expect(rank[souple.level]).toBeGreaterThanOrEqual(rank[strict.level]);
    }
  });
  it("le gluten reste plafonné même en mode souple", () => {
    const prod = p({ ingredientsTags: ["en:wheat"], allergensTags: ["en:gluten"] });
    const souple = evaluate(prod, applyDietMode(rs, "souple"));
    expect(souple.status === "scored" && souple.level).not.toBe("green");
  });
});
