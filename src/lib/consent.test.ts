import { beforeEach, describe, expect, it } from "vitest";
import { installFakeLocalStorage } from "./testing/local-storage";
import {
  DISCLAIMER_VERSION, POLICY_VERSION, acceptDisclaimer, addHistory, consentStatus, deleteAllData, getFavorites,
  getHistory, getProfileId, isFavorite, needsOnboarding, setConsent, toggleFavorite,
} from "./storage";
import { getPrefs, parsePrefs, setPrefs } from "./prefs";
import { defaultRuleSet as rs } from "@rules/index";
import type { NormalizedProduct } from "./score/types";

let store: Map<string, string>;
beforeEach(() => { store = installFakeLocalStorage(); });

const product: NormalizedProduct = {
  code: "3017620422003", name: "Pâte à tartiner", brands: "Marque", imageUrl: null,
  ingredientsTags: ["en:sugar", "en:wheat"], additivesTags: [], allergensTags: [], tracesTags: [],
  labelsTags: [], categoriesTags: [], novaGroup: 4, nutriments: {},
};
const entry = { source: "barcode" as const, code: product.code, name: product.name, brands: null, status: "scored" as const, score: 10, level: "red" as const };

describe("parcours de consentement : premier lancement", () => {
  it("rien n'est accepté : onboarding requis", () => {
    expect(needsOnboarding()).toBe(true);
    expect(consentStatus()).toBe("unknown");
    expect(store.size).toBe(0);
  });
  it("disclaimer accepté mais pas de choix de consentement : onboarding toujours requis", () => {
    acceptDisclaimer();
    expect(needsOnboarding()).toBe(true);
  });
});

describe("consentement ACCEPTÉ", () => {
  beforeEach(() => { acceptDisclaimer(); setConsent(true, "hashimoto"); });

  it("débloque l'app et enregistre le profil sur l'appareil", () => {
    expect(needsOnboarding()).toBe(false);
    expect(consentStatus()).toBe("granted");
    expect(getProfileId()).toBe("hashimoto");
    expect(store.has("hs:v1:profile")).toBe(true);
  });
  it("enregistre l'historique et les favoris", () => {
    expect(addHistory(entry)).toBe(true);
    expect(getHistory()).toHaveLength(1);
    expect(toggleFavorite(product, rs)).toBe("added");
    expect(isFavorite(product.code)).toBe(true);
    expect(toggleFavorite(product, rs)).toBe("removed");
  });
  it("conserve la version des textes acceptée (pour le redemander plus tard)", () => {
    const c = JSON.parse(store.get("hs:v1:consent")!);
    expect(c.policyVersion).toBe(POLICY_VERSION);
    expect(JSON.parse(store.get("hs:v1:disclaimer")!).version).toBe(DISCLAIMER_VERSION);
  });
  it("retirer le consentement efface profil, historique ET favoris", () => {
    addHistory(entry);
    toggleFavorite(product, rs);
    setConsent(false);
    expect(store.has("hs:v1:profile")).toBe(false);
    expect(store.has("hs:v1:history")).toBe(false);
    expect(store.has("hs:v1:favorites")).toBe(false);
    expect(getHistory()).toEqual([]);
  });
});

describe("consentement REFUSÉ : l'app fonctionne, rien n'est sauvegardé", () => {
  beforeEach(() => { acceptDisclaimer(); setConsent(false, "hashimoto"); });

  it("débloque quand même l'app (le refus ne bloque pas l'accès)", () => {
    expect(needsOnboarding()).toBe(false);
    expect(consentStatus()).toBe("refused");
  });
  it("n'écrit AUCUNE donnée de santé : seulement le refus et le disclaimer", () => {
    addHistory(entry);
    expect(toggleFavorite(product, rs)).toBe("denied");
    expect(Object.keys(Object.fromEntries(store)).sort()).toEqual(["hs:v1:consent", "hs:v1:disclaimer"]);
    expect(getHistory()).toEqual([]);
    expect(getFavorites()).toEqual([]);
  });
  it("garde le profil choisi en SESSION (mémoire), pas sur l'appareil", () => {
    setConsent(false, "aip");
    expect(getProfileId()).toBe("aip");
    expect(JSON.stringify([...store.values()])).not.toContain("aip");
  });
  it("profil par défaut si l'identifiant est invalide", () => {
    setConsent(false, "../../etc");
    expect(getProfileId()).toBe("hashimoto");
  });
});

describe("textes modifiés : le consentement est redemandé", () => {
  it("un consentement donné pour une ancienne version ne vaut plus", () => {
    acceptDisclaimer();
    setConsent(true, "hashimoto");
    addHistory(entry);
    const c = JSON.parse(store.get("hs:v1:consent")!);
    store.set("hs:v1:consent", JSON.stringify({ ...c, policyVersion: "ancienne-version" }));
    expect(consentStatus()).toBe("unknown");
    expect(needsOnboarding()).toBe(true);
    expect(getHistory()).toEqual([]); // rien n'est lu ni écrit tant que non reconfirmé
    expect(addHistory(entry)).toBe(false);
  });
  it("un disclaimer d'une ancienne version est redemandé", () => {
    acceptDisclaimer();
    setConsent(true, "hashimoto");
    store.set("hs:v1:disclaimer", JSON.stringify({ version: "0", at: new Date().toISOString() }));
    expect(needsOnboarding()).toBe(true);
  });
});

describe("robustesse des données locales", () => {
  it("revalide un favori altéré dans le stockage", () => {
    acceptDisclaimer();
    setConsent(true, "hashimoto");
    store.set("hs:v1:favorites", JSON.stringify([
      { code: "3017620422003", addedAt: "2026-01-01T00:00:00.000Z", product: { ...product, name: "<img src=x onerror=alert(1)>Gâteau", ingredientsTags: ["en:wheat", "<script>"], imageUrl: "https://evil.example/x.png" }, computed: { score: "pas un nombre" } },
      { code: "1", product: {} },
      "n'importe quoi",
    ]));
    const favs = getFavorites();
    expect(favs).toHaveLength(1);
    expect(favs[0]!.product.name).not.toMatch(/[<>]/);
    expect(favs[0]!.product.ingredientsTags).toEqual(["en:wheat"]);
    expect(favs[0]!.product.imageUrl).toBeNull();
    expect(favs[0]!.computed.ruleSetVersion).toBe(""); // calcul invalide => sera refait
  });
});

describe("« Supprimer toutes mes données »", () => {
  it("efface TOUT ce qui est préfixé hs:v1: (favoris, préférences, opt-in rapports inclus) et rien d'autre", async () => {
    acceptDisclaimer();
    setConsent(true, "hashimoto");
    addHistory(entry);
    toggleFavorite(product, rs);
    setPrefs({ theme: "dark", textSize: "xlarge", errorReports: true });
    store.set("autre-site:cle", "garder");
    expect([...store.keys()].filter((k) => k.startsWith("hs:v1:")).length).toBeGreaterThanOrEqual(5);

    await deleteAllData();

    expect([...store.keys()].filter((k) => k.startsWith("hs:v1:"))).toEqual([]);
    expect(store.get("autre-site:cle")).toBe("garder");
    expect(needsOnboarding()).toBe(true); // retour à l'onboarding
    expect(getPrefs().errorReports).toBe(false); // opt-in remis à « désactivé »
  });
});

describe("préférences", () => {
  it("rapports d'erreur : désactivés par défaut, opt-in seulement sur `true` explicite", () => {
    expect(getPrefs().errorReports).toBe(false);
    expect(parsePrefs({ errorReports: "true" }).errorReports).toBe(false);
    expect(parsePrefs({ errorReports: 1 }).errorReports).toBe(false);
    expect(parsePrefs({ errorReports: true }).errorReports).toBe(true);
  });
  it("valeurs invalides retombent sur les défauts", () => {
    expect(parsePrefs({ theme: "rose", textSize: "gigantesque" })).toEqual({ theme: "auto", textSize: "normal", errorReports: false });
  });
});
