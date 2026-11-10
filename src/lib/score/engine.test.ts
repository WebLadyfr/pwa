import { describe, expect, it } from "vitest";
import { evaluate } from "./engine";
import { validateRuleSet } from "./validate";
import { defaultRuleSet as rs } from "@rules/index";
import { mapOffProduct, cleanText, cleanTags, cleanImageUrl } from "../sanitize";
import { isValidGtin } from "../barcode";
import type { NormalizedProduct } from "./types";

const base: NormalizedProduct = {
  code: "3017620422003", name: "Test", brands: null, imageUrl: null,
  ingredientsTags: [], additivesTags: [], allergensTags: [], tracesTags: [],
  labelsTags: [], categoriesTags: [], novaGroup: null, nutriments: {},
};
const p = (o: Partial<NormalizedProduct>): NormalizedProduct => ({ ...base, ...o });

describe("fichier de règles", () => {
  it("est valide", () => {
    expect(() => validateRuleSet(rs)).not.toThrow();
  });
  it("rejette un identifiant mal formé", () => {
    const bad = structuredClone(rs);
    bad.rules[0]!.match.ingredients = ["blé"];
    expect(() => validateRuleSet(bad)).toThrow();
  });
  it("rejette des seuils incohérents", () => {
    const bad = structuredClone(rs);
    bad.scoring.thresholds = { green: 30, orange: 60 };
    expect(() => validateRuleSet(bad)).toThrow();
  });
});

describe("moteur de score", () => {
  it("produit avec gluten + soja + sucre => rouge, raisons détaillées", () => {
    const r = evaluate(
      p({ ingredientsTags: ["en:wheat", "en:soy", "en:sugar", "en:sunflower-oil"], novaGroup: 4 }),
      rs,
    );
    expect(r.status).toBe("scored");
    if (r.status !== "scored") return;
    expect(r.level).toBe("red");
    expect(r.score).toBe(0);
    const ids = r.reasons.map((x) => x.ruleId);
    expect(ids).toEqual(expect.arrayContaining(["gluten", "soy", "added_sugars", "refined_oils", "ultra_processed"]));
    expect(r.reasons.find((x) => x.ruleId === "added_sugars")!.items).toContain("en:sugar");
  });

  it("produit propre (NOVA 1, fibres, oméga-3) => vert", () => {
    const r = evaluate(
      p({ ingredientsTags: ["en:salmon"], novaGroup: 1, nutriments: { fiber_100g: 4 } }),
      rs,
    );
    expect(r.status === "scored" && r.level).toBe("green");
    expect(r.status === "scored" && r.score).toBeGreaterThanOrEqual(65);
    expect(r.status === "scored" && r.reasons.every((x) => x.points >= 0)).toBe(true);
  });

  it("le cumul des bonus est plafonné", () => {
    const r = evaluate(
      p({
        ingredientsTags: ["en:brazil-nut", "en:pumpkin-seed", "en:flaxseed"],
        novaGroup: 1,
        nutriments: { fiber_100g: 10 },
      }),
      rs,
    );
    expect(r.status === "scored" && r.score).toBe(50 + rs.scoring.caps.maxBonus);
  });

  it("données manquantes => 'insufficient', jamais de score inventé", () => {
    expect(evaluate(p({}), rs).status).toBe("insufficient");
    // NOVA seul ne suffit pas non plus
    expect(evaluate(p({ novaGroup: 4 }), rs).status).toBe("insufficient");
  });

  it("ingrédients multilingues : seul le tag normalisé compte", () => {
    // Étiquettes arabe / français / anglais : OFF produit les mêmes tags "en:".
    const fromFr = mapOffProduct({ ingredients_text: "farine de blé, sucre", ingredients_tags: ["en:wheat-flour", "en:wheat", "en:sugar"] });
    const fromAr = mapOffProduct({ ingredients_text: "دقيق القمح، سكر", ingredients_tags: ["en:wheat-flour", "en:wheat", "en:sugar"] });
    const a = evaluate(fromFr, rs);
    const b = evaluate(fromAr, rs);
    expect(a).toEqual(b);
    expect(a.status === "scored" && a.reasons.map((r) => r.ruleId)).toEqual(expect.arrayContaining(["gluten", "added_sugars"]));
  });

  it("tags non normalisés (fr:...) sont ignorés par la règle, sans planter", () => {
    const r = evaluate(p({ ingredientsTags: ["fr:farine-inconnue"] }), rs);
    expect(r.status === "scored" && r.score).toBe(50);
  });

  it("algues => alerte iode, plafonné à orange même avec bon score", () => {
    const r = evaluate(p({ ingredientsTags: ["en:kelp"], novaGroup: 1, nutriments: { fiber_100g: 8 } }), rs);
    expect(r.status === "scored" && r.level).toBe("orange");
    expect(r.status === "scored" && r.reasons.some((x) => x.ruleId === "iodine_excess")).toBe(true);
  });

  it("allergènes et traces déclarés sont signalés sans changer le score", () => {
    const r = evaluate(p({ ingredientsTags: ["en:rice"], allergensTags: ["en:milk"], tracesTags: ["en:nuts"] }), rs);
    expect(r.status === "scored" && r.score).toBe(50);
    expect(r.status === "scored" && r.reasons.map((x) => x.ruleId)).toEqual(
      expect.arrayContaining(["allergens_declared", "traces_declared"]),
    );
  });

  it("traces de gluten => petit malus", () => {
    const r = evaluate(p({ ingredientsTags: ["en:rice"], tracesTags: ["en:gluten"] }), rs);
    expect(r.status === "scored" && r.score).toBe(45);
  });

  it("émulsifiants et édulcorants via additifs", () => {
    const r = evaluate(p({ ingredientsTags: ["en:water"], additivesTags: ["en:e471", "en:e950"] }), rs);
    expect(r.status === "scored" && r.reasons.map((x) => x.ruleId)).toEqual(expect.arrayContaining(["emulsifiers", "sweeteners"]));
  });

  it("le score reste borné entre 0 et 100", () => {
    const r = evaluate(p({ ingredientsTags: ["en:wheat", "en:soy", "en:sugar"], novaGroup: 4 }), rs);
    expect(r.status === "scored" && r.score).toBeGreaterThanOrEqual(0);
  });

  it("signale que les règles sont en brouillon", () => {
    const r = evaluate(p({ ingredientsTags: ["en:rice"] }), rs);
    expect(r.status === "scored" && r.draftRules).toBe(true);
  });
});

describe("assainissement des données externes", () => {
  it("rejette les tags hostiles", () => {
    expect(cleanTags(["en:sugar", "<script>alert(1)</script>", "en:ok-tag", "EN:Upper", 42, "javascript:alert"])).toEqual(["en:sugar", "en:ok-tag"]);
  });
  it("neutralise < > et caractères de contrôle dans les textes", () => {
    expect(cleanText("<img src=x onerror=alert(1)>Biscuit\u0000")).not.toMatch(/[<>\u0000]/);
  });
  it("n'accepte que les images HTTPS d'Open Food Facts", () => {
    expect(cleanImageUrl("https://images.openfoodfacts.org/images/x.jpg")).not.toBeNull();
    expect(cleanImageUrl("https://evil.example/x.jpg")).toBeNull();
    expect(cleanImageUrl("javascript:alert(1)")).toBeNull();
    expect(cleanImageUrl("http://images.openfoodfacts.org/x.jpg")).toBeNull();
  });
  it("ignore des nutriments aberrants", () => {
    const m = mapOffProduct({ nutriments: { sugars_100g: "12", fiber_100g: -3, zinc_100g: 0.002 } });
    expect(m.nutriments).toEqual({ zinc_100g: 0.002 });
  });
});

describe("GTIN", () => {
  it("valide le chiffre de contrôle", () => {
    expect(isValidGtin("3017620422003")).toBe(true);
    expect(isValidGtin("3017620422004")).toBe(false);
    expect(isValidGtin("abc")).toBe(false);
    expect(isValidGtin("12345")).toBe(false);
  });
});
