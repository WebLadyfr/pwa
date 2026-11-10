import { describe, expect, it } from "vitest";
import { computeFavorite, refreshAll, refreshFavorite, type Favorite } from "./favorites";
import { defaultRuleSet } from "@rules/index";
import type { NormalizedProduct, RuleSet } from "./score/types";

const wheat: NormalizedProduct = {
  code: "3017620422003", name: "Pain", brands: null, imageUrl: null,
  ingredientsTags: ["en:wheat-flour", "en:wheat"], additivesTags: [], allergensTags: [], tracesTags: [],
  labelsTags: [], categoriesTags: [], novaGroup: null, nutriments: {},
};
const T0 = new Date("2026-01-01T10:00:00Z");
const T1 = new Date("2026-06-01T10:00:00Z");

function fav(product = wheat): Favorite {
  return { code: product.code!, addedAt: T0.toISOString(), product, computed: computeFavorite(product, defaultRuleSet, T0) };
}
/** Même profil, règles modifiées (version bumpée) : gluten beaucoup moins pénalisant. */
function softerRules(): RuleSet {
  const rs = structuredClone(defaultRuleSet);
  rs.version = "0.2.0-test";
  rs.rules.find((r) => r.id === "gluten")!.points = -5;
  return rs;
}

describe("recalcul des favoris quand les règles changent", () => {
  it("score initial calculé avec les règles d'origine", () => {
    const f = fav();
    expect(f.computed).toMatchObject({ status: "scored", score: 25, level: "red", ruleSetVersion: defaultRuleSet.version });
  });

  it("à l'ouverture avec de nouvelles règles : score recalculé, date mise à jour, jamais l'ancien score", () => {
    const { fav: out, changed } = refreshFavorite(fav(), softerRules(), T1);
    expect(changed).toBe(true);
    expect(out.computed.score).toBe(45);
    expect(out.computed.level).toBe("orange");
    expect(out.computed.ruleSetVersion).toBe("0.2.0-test");
    expect(out.computed.at).toBe(T1.toISOString());
    expect(out.addedAt).toBe(T0.toISOString()); // la date d'ajout ne bouge pas
  });

  it("mêmes règles : rien ne change (la date du dernier calcul n'est pas écrasée)", () => {
    const f = fav();
    const r = refreshFavorite(f, defaultRuleSet, T1);
    expect(r.changed).toBe(false);
    expect(r.fav).toBe(f);
    expect(r.fav.computed.at).toBe(T0.toISOString());
  });

  it("nouvelle version des règles avec le même résultat : recalculé aussi (version à jour)", () => {
    const same = structuredClone(defaultRuleSet);
    same.version = "0.1.1";
    const r = refreshFavorite(fav(), same, T1);
    expect(r.changed).toBe(true);
    expect(r.fav.computed.ruleSetVersion).toBe("0.1.1");
    expect(r.fav.computed.score).toBe(25);
  });

  it("un calcul stocké invalide (version vide) est refait", () => {
    const f = fav();
    f.computed = { at: new Date(0).toISOString(), ruleSetVersion: "", status: "insufficient", score: null, level: null };
    const r = refreshFavorite(f, defaultRuleSet, T1);
    expect(r.changed).toBe(true);
    expect(r.fav.computed.score).toBe(25);
  });

  it("produit sans données suffisantes : jamais de score inventé", () => {
    const empty = { ...wheat, ingredientsTags: [] };
    expect(computeFavorite(empty, defaultRuleSet, T0)).toMatchObject({ status: "insufficient", score: null, level: null });
  });

  it("refreshAll signale s'il y a eu un changement", () => {
    const list = [fav(), fav({ ...wheat, code: "3274080005003", name: "Autre" })];
    expect(refreshAll(list, defaultRuleSet, T1).changed).toBe(false);
    const r = refreshAll(list, softerRules(), T1);
    expect(r.changed).toBe(true);
    expect(r.favs.every((f) => f.computed.ruleSetVersion === "0.2.0-test")).toBe(true);
  });
});
