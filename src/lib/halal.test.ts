import { describe, expect, it } from "vitest";
import { halalStatus } from "./halal";
import type { NormalizedProduct } from "./score/types";

const base: NormalizedProduct = {
  code: null, name: null, brands: null, imageUrl: null, ingredientsTags: [], additivesTags: [], allergensTags: [],
  tracesTags: [], labelsTags: [], categoriesTags: [], novaGroup: null, nutriments: {},
};
const p = (o: Partial<NormalizedProduct>): NormalizedProduct => ({ ...base, ...o });

describe("halalStatus", () => {
  it("sans donnée : inconnu", () => expect(halalStatus(p({})).status).toBe("unknown"));
  it("végétal simple : compatible", () => expect(halalStatus(p({ ingredientsTags: ["en:rice", "en:salt"] })).status).toBe("compatible"));
  it("porc : non halal", () => {
    const r = halalStatus(p({ ingredientsTags: ["en:pork", "en:salt"] }));
    expect(r.status).toBe("not_halal");
    expect(r.forbidden).toEqual(["en:pork"]);
  });
  it("alcool : non halal", () => expect(halalStatus(p({ ingredientsTags: ["en:wine"] })).status).toBe("not_halal"));
  it("le label halal ne rattrape pas le porc", () => {
    expect(halalStatus(p({ ingredientsTags: ["en:pork"], labelsTags: ["en:halal"] })).status).toBe("not_halal");
  });
  it("viande sans label : à vérifier", () => {
    const r = halalStatus(p({ ingredientsTags: ["en:chicken"] }));
    expect(r.status).toBe("check");
    expect(r.meat).toEqual(["en:chicken"]);
  });
  it("viande avec label halal : certifié", () => {
    expect(halalStatus(p({ ingredientsTags: ["en:chicken"], labelsTags: ["en:halal"] })).status).toBe("certified");
  });
  it("gélatine ou E471 : à vérifier", () => {
    expect(halalStatus(p({ ingredientsTags: ["en:gelatin"] })).status).toBe("check");
    expect(halalStatus(p({ ingredientsTags: ["en:flour"], additivesTags: ["en:e471"] })).status).toBe("check");
  });
});
