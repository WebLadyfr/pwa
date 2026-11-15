import { describe, expect, it } from "vitest";
import type { NormalizedProduct } from "./score/types";
import { veggieStatus } from "./veggie";

const p = (over: Partial<NormalizedProduct>): NormalizedProduct => ({
  code: "1", name: "x", brands: null, imageUrl: null, ingredientsTags: [], additivesTags: [], allergensTags: [],
  tracesTags: [], labelsTags: [], categoriesTags: [], novaGroup: null, nutriments: {}, ...over,
});

describe("végétarien / végan", () => {
  it("sans données : inconnu", () => {
    expect(veggieStatus(p({})).status).toBe("unknown");
  });
  it("végan : ingrédients végétaux", () => {
    expect(veggieStatus(p({ ingredientsTags: ["en:rice", "en:sunflower-oil"] })).status).toBe("vegan");
  });
  it("végétarien mais pas végan : lait, œuf, miel", () => {
    const r = veggieStatus(p({ ingredientsTags: ["en:rice", "en:skimmed-milk"], allergensTags: ["en:milk"] }));
    expect(r.status).toBe("vegetarian");
    expect(r.nonVegan).toContain("en:skimmed-milk");
  });
  it("additif d'origine animale (carmin E120, gélatine E441) : non végétarien", () => {
    expect(veggieStatus(p({ ingredientsTags: ["en:sugar"], additivesTags: ["en:e120"] })).status).toBe("not_vegetarian");
    expect(veggieStatus(p({ additivesTags: ["en:e441"] })).status).toBe("not_vegetarian");
  });
  it("cire d'abeille E901 : végétarien mais pas végan", () => {
    expect(veggieStatus(p({ ingredientsTags: ["en:sugar"], additivesTags: ["en:e901"] })).status).toBe("vegetarian");
  });
  it("additif d'origine incertaine (E471) : signalé sans trancher", () => {
    const r = veggieStatus(p({ ingredientsTags: ["en:flour"], additivesTags: ["en:e471"] }));
    expect(r.status).toBe("vegan");
    expect(r.uncertain).toEqual(["en:e471"]);
  });
  it("poisson via allergène", () => {
    expect(veggieStatus(p({ ingredientsTags: ["en:rice"], allergensTags: ["en:fish"] })).status).toBe("not_vegetarian");
  });
});
