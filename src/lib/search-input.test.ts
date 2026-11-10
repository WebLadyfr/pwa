import { describe, expect, it } from "vitest";
import { MAX_QUERY, normalizeQuery, toOffQuery } from "./search-input";

const ok = (raw: unknown) => {
  const r = normalizeQuery(raw);
  return r.ok ? r.q : null;
};
const reason = (raw: unknown) => {
  const r = normalizeQuery(raw);
  return r.ok ? null : r.reason;
};

describe("validation du terme de recherche", () => {
  it("accepte des termes normaux, avec accents, apostrophes, tirets, chiffres", () => {
    expect(ok("biscuit chocolat")).toBe("biscuit chocolat");
    expect(ok("Crème brûlée")).toBe("Crème brûlée");
    expect(ok("l'Alsacienne")).toBe("l'Alsacienne");
    expect(ok("Ben & Jerry's")).toBe("Ben & Jerry's");
    expect(ok("coca-cola 33cl")).toBe("coca-cola 33cl");
  });
  it("accepte d'autres alphabets (arabe)", () => {
    expect(ok("حليب")).toBe("حليب");
  });
  it("normalise les espaces et l'Unicode (NFC)", () => {
    expect(ok("  pâtes   complètes  ")).toBe("pâtes complètes");
    expect(ok("éclair")).toBe("éclair"); // e + accent combinant -> é
  });
  it("refuse trop court / trop long", () => {
    expect(reason("a")).toBe("short");
    expect(reason("   ")).toBe("short");
    expect(reason("")).toBe("short");
    expect(reason("a".repeat(MAX_QUERY + 1))).toBe("long");
    expect(reason("a".repeat(5000))).toBe("long");
    expect(ok("a".repeat(MAX_QUERY))).not.toBeNull();
  });
  it("refuse les types non texte", () => {
    for (const v of [undefined, null, 42, {}, ["a"], true]) expect(reason(v)).toBe("type");
  });
  it("refuse la syntaxe de requête et les caractères dangereux", () => {
    for (const v of ["code:*", 'nutella "x"', "a*b", "(foo)", "foo~2", "<script>alert(1)</script>", "a;b", "a/b", "a\\b", "{x}", "[x]", "a|b", "a^2", "a?b", "a\nb\u0000", "a%20b", "a=b", "$(whoami)", "`id`"]) {
      expect(reason(v), JSON.stringify(v)).toBe("chars");
    }
  });
  it("neutralise les opérateurs qui passent la liste blanche", () => {
    expect(ok("-sucre")).toBe("sucre");
    expect(ok("lait --chocolat")).toBe("lait chocolat");
    expect(ok("lait NOT chocolat")).toBe("lait chocolat");
    expect(reason("AND")).toBe("short");
    expect(reason("or and not")).toBe("short");
    expect(reason("--")).toBe("short");
  });
  it("toOffQuery remplace les apostrophes par des espaces", () => {
    expect(toOffQuery("l'Alsacienne  d’or")).toBe("l Alsacienne d or");
  });
});
