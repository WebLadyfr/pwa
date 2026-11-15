import { describe, expect, it } from "vitest";
import { PROFILES } from "@rules/index";
import fr from "./messages/fr.json";
import en from "./messages/en.json";
import ar from "./messages/ar.json";
import { t, tagLabel } from "./index";

const ph = (s: string) => (s.match(/\{\w+\}/g) ?? []).sort().join(",");

describe("catalogues de langues", () => {
  for (const [name, cat] of [["en", en], ["ar", ar]] as const) {
    it(`${name} : mêmes clés et mêmes variables que le français`, () => {
      const frKeys = Object.keys(fr);
      expect(Object.keys(cat).sort()).toEqual([...frKeys].sort());
      for (const k of frKeys) expect(ph((cat as Record<string, string>)[k]!), k).toBe(ph((fr as Record<string, string>)[k]!));
    });
    it(`${name} : aucune valeur vide`, () => {
      for (const [k, v] of Object.entries(cat)) expect(v.trim().length, k).toBeGreaterThan(0);
    });
  }
  it("chaque profil a un nom et une description dans chaque langue", () => {
    for (const id of Object.keys(PROFILES)) {
      for (const cat of [fr, en, ar] as Record<string, string>[]) {
        expect(cat[`profile.${id}`], id).toBeTruthy();
        expect(cat[`profile.${id}.desc`], id).toBeTruthy();
      }
    }
  });
  it("chaque règle de chaque profil a son texte dans chaque langue", () => {
    for (const rs of Object.values(PROFILES)) {
      for (const r of rs.rules) for (const cat of [fr, en, ar] as Record<string, string>[]) expect(cat[r.reasonKey], r.reasonKey).toBeTruthy();
    }
  });
  it("t() retombe sur le français puis sur la clé", () => {
    expect(t("nav.scan", undefined, "en")).toBe("Scan");
    expect(t("cle.inconnue")).toBe("cle.inconnue");
    expect(tagLabel("en:wheat", "ar")).toBe("قمح");
  });
});
