import { describe, expect, it } from "vitest";
import { estimateGlycemicIndex, giLevel } from "./glycemic";
import type { NormalizedProduct } from "./score/types";

const p = (o: Partial<NormalizedProduct>): NormalizedProduct => ({
  code: null, name: null, brands: null, imageUrl: null, ingredientsTags: [], additivesTags: [], allergensTags: [],
  tracesTags: [], labelsTags: [], categoriesTags: [], novaGroup: null, nutriments: {}, ...o,
});

describe("giLevel", () => {
  it("seuils 55 / 69", () => {
    expect(giLevel(55)).toBe("low");
    expect(giLevel(56)).toBe("medium");
    expect(giLevel(69)).toBe("medium");
    expect(giLevel(70)).toBe("high");
  });
});

describe("estimateGlycemicIndex", () => {
  it("peu de glucides : sans objet", () => {
    expect(estimateGlycemicIndex(p({ ingredientsTags: ["en:sugar"], nutriments: { carbohydrates_100g: 2 } })).status).toBe("no_carbs");
  });
  it("sans ingrédient reconnu : inconnu", () => {
    expect(estimateGlycemicIndex(p({ ingredientsTags: ["en:water", "en:salt"] })).status).toBe("unknown");
  });
  it("pondère les ingrédients de tête", () => {
    const r = estimateGlycemicIndex(p({ ingredientsTags: ["en:wheat-flour", "en:water", "en:sugar", "en:lentils"] }));
    expect(r.status).toBe("estimate");
    if (r.status === "estimate") {
      expect(r.basis).toEqual(["en:wheat-flour", "en:sugar", "en:lentils"]);
      expect(r.value).toBe(Math.round((75 * 3 + 65 * 2 + 30) / 6)); // 64
      expect(r.level).toBe("medium");
    }
  });
  it("lentilles seules : bas", () => {
    const r = estimateGlycemicIndex(p({ ingredientsTags: ["en:lentils"], nutriments: { carbohydrates_100g: 20 } }));
    expect(r.status === "estimate" && r.level).toBe("low");
  });
  it("riz blanc et glucose : élevé", () => {
    const r = estimateGlycemicIndex(p({ ingredientsTags: ["en:white-rice", "en:glucose-syrup"] }));
    expect(r.status === "estimate" && r.level).toBe("high");
  });
  it("pas de doublon de tag", () => {
    const r = estimateGlycemicIndex(p({ ingredientsTags: ["en:sugar", "en:sugar"] }));
    expect(r.status === "estimate" && r.basis).toEqual(["en:sugar"]);
  });
});
