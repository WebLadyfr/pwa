import { readFileSync } from "node:fs";
import path from "node:path";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it } from "vitest";
import fr from "@/i18n/messages/fr.json";
import en from "@/i18n/messages/en.json";
import ar from "@/i18n/messages/ar.json";
import { LegalConsentLine } from "@/components/LegalConsentLine";
import { LegalMenu } from "@/components/LegalMenu";
import { LegalText } from "@/components/LegalText";
import { MedicalNote } from "@/components/MedicalNote";
import { installFakeLocalStorage } from "@/lib/testing/local-storage";
import { POLICY_VERSION, acceptDisclaimer, consentStatus, needsOnboarding, setConsent } from "@/lib/storage";
import { LEGAL_PAGES, LEGAL_SLUGS, LEGAL_UPDATED, LEGAL_VERSION } from "./index";

const root = path.resolve(import.meta.dirname, "../../..");
const read = (rel: string) => readFileSync(path.join(root, rel), "utf8");
const render = (el: Parameters<typeof renderToStaticMarkup>[0]) => renderToStaticMarkup(el);
const esc = (s: string) => s.replaceAll("'", "&#x27;"); // le rendu HTML échappe les apostrophes

describe("routes des pages légales", () => {
  it("les cinq pages demandées existent, avec les adresses prévues", () => {
    expect(LEGAL_SLUGS).toEqual(["mentions", "cgu", "confidentialite", "avertissement", "licences"]);
  });
  it("une route dynamique statique couvre exactement ces pages et refuse tout autre slug", () => {
    const src = read("src/app/legal/[slug]/page.tsx");
    expect(src).toContain("generateStaticParams");
    expect(src).toContain("LEGAL_PAGES.map");
    expect(src).toContain("dynamicParams = false");
    expect(src).toContain("notFound()");
  });
  it("les anciennes adresses redirigent vers les nouvelles", () => {
    expect(read("src/app/privacy/page.tsx")).toContain('redirect("/legal/confidentialite")');
    expect(read("src/app/terms/page.tsx")).toContain('redirect("/legal/cgu")');
  });
  it("chaque page a un bouton retour, la date de mise à jour et le bandeau « à faire relire »", () => {
    const src = read("src/app/legal/[slug]/page.tsx");
    expect(src).toContain("<BackButton");
    expect(src).toContain("Dernière mise à jour");
    expect(src).toContain("<Draft");
    expect(LEGAL_UPDATED).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
  it("le service worker met les pages légales en cache (au démarrage et à la visite)", () => {
    const sw = read("public/sw.js");
    for (const slug of LEGAL_SLUGS) expect(sw).toContain(`"/legal/${slug}"`);
    expect(sw).toContain("...LEGAL_PAGES");
    expect(sw).toMatch(/Promise\.allSettled\(LEGAL_PAGES/);
  });
  it("la porte d'accès laisse lire les pages légales sans onboarding", () => {
    expect(read("src/components/AppGate.tsx")).toMatch(/OPEN_PATHS = \[[^\]]*"\/legal"/);
  });
});

describe("accessibilité et contenu", () => {
  it.each(LEGAL_PAGES.map((p) => [p.slug, p] as const))("%s : contenu structuré, sans HTML brut ni lien externe", (_slug, page) => {
    expect(page.title.length).toBeGreaterThan(3);
    expect(page.blocks.length).toBeGreaterThan(0);
    const headings = page.blocks.map((b) => b.h).filter(Boolean);
    expect(new Set(headings).size).toBe(headings.length); // titres uniques (ancres/labels distincts)
    const all = JSON.stringify(page.blocks);
    expect(all).not.toMatch(/<[a-z/]/i);
    expect(all).not.toMatch(/https?:\/\//);
    for (const m of all.matchAll(/\]\(([^)]*)\)/g)) expect(m[1]).toMatch(/^\//); // liens internes uniquement
  });
  it("le rendu produit des titres h2 reliés à leur section (aria-labelledby) et des liens internes", () => {
    const html = render(createElement(LegalText, { blocks: [{ h: "Titre", p: ["Texte **gras** et [lien](/settings#s-delete)."] }] }));
    expect(html).toMatch(/<section[^>]*aria-labelledby="lg-h-0"/);
    expect(html).toContain('<h2 id="lg-h-0"');
    expect(html).toContain("<strong>gras</strong>");
    expect(html).toContain('href="/settings#s-delete"');
  });
  it("un lien non interne n'est jamais rendu cliquable", () => {
    const html = render(createElement(LegalText, { blocks: [{ p: ["[piège](https://exemple.test)"] }] }));
    expect(html).not.toContain("<a");
  });
  it("la politique de confidentialité affiche la version des textes et un lien pour tout supprimer", () => {
    const html = render(createElement(LegalText, { blocks: LEGAL_PAGES.find((p) => p.slug === "confidentialite")!.blocks }));
    expect(html).toContain(LEGAL_VERSION);
    expect(html).toContain('href="/settings#s-delete"');
    expect(html).toMatch(/Sentry/);
    expect(html).toMatch(/désactiv/);
  });
  it("la page Avertissement s'appuie sur la clé i18n « disclaimer » (source unique) et ce texte est la phrase exacte", () => {
    expect(read("src/app/legal/[slug]/page.tsx")).toContain('t("disclaimer"');
    expect(fr.disclaimer).toBe("Information bien-être indicative. Ne remplace pas l'avis d'un professionnel de santé. Ne constitue ni un diagnostic ni un traitement.");
  });
});

describe("bloc « À propos et informations légales » (Réglages)", () => {
  const html = render(createElement(LegalMenu));
  it("liste les cinq pages + contact, chacune avec une icône et un chevron", () => {
    for (const slug of LEGAL_SLUGS) expect(html).toContain(`href="/legal/${slug}"`);
    expect(html).toContain(fr["legal.contact"]);
    expect((html.match(/<li/g) ?? []).length).toBe(LEGAL_SLUGS.length + 1);
    expect((html.match(/<svg/g) ?? []).length).toBeGreaterThanOrEqual((LEGAL_SLUGS.length + 1) * 2);
    expect(html).toContain('aria-hidden="true"'); // icônes décoratives : le libellé porte le sens
  });
  it("Réglages utilise ce bloc", () => {
    expect(read("src/app/settings/page.tsx")).toContain("<LegalMenu");
  });
});

describe("rappels contextuels", () => {
  it("le résultat d'un scan affiche le disclaimer court avec « En savoir plus » vers l'avertissement médical", () => {
    const html = render(createElement(MedicalNote));
    expect(html).toContain(fr["disclaimer.short"]);
    expect(html).toContain('href="/legal/avertissement"');
    expect(html).toContain(fr["legal.learnmore"]);
    expect(html).toContain('role="note"');
    expect(read("src/components/ResultScreen.tsx")).toMatch(/<ScoreBadge[^>]*\/>\s*<MedicalNote \/>/);
  });
  it("l'onboarding : la phrase de consentement contient des liens cliquables vers les CGU et la confidentialité", () => {
    const html = render(createElement(LegalConsentLine));
    expect(html).toContain('href="/legal/cgu"');
    expect(html).toContain('href="/legal/confidentialite"');
    expect(html).toContain(esc(fr["legal.terms"]));
    expect(html).toContain(esc(fr["legal.privacy"]));
    expect(html).toContain('rel="noopener noreferrer"');
    expect(read("src/components/Onboarding.tsx")).toContain("<LegalConsentLine");
  });
  it.each([["fr", fr], ["en", en], ["ar", ar]] as const)("%s : toutes les nouvelles clés existent et la phrase contient les deux emplacements", (_l, cat) => {
    const c = cat as Record<string, string>;
    for (const k of ["settings.about", "legal.medical", "legal.licenses", "legal.contact", "legal.version", "legal.back", "legal.learnmore", "disclaimer.short", "onboarding.legal.sentence"]) {
      expect(c[k], k).toBeTruthy();
    }
    expect(c["onboarding.legal.sentence"]).toContain("{terms}");
    expect(c["onboarding.legal.sentence"]).toContain("{privacy}");
  });
});

describe("version des textes et consentement", () => {
  beforeEach(() => { installFakeLocalStorage(); });
  it("POLICY_VERSION vient de LEGAL_VERSION (source unique)", () => {
    expect(POLICY_VERSION).toBe(LEGAL_VERSION);
  });
  it("un consentement donné pour une ancienne version des textes est redemandé", () => {
    acceptDisclaimer();
    setConsent(true, "hashimoto");
    expect(needsOnboarding()).toBe(false);
    const key = "hs:v1:consent";
    const rec = JSON.parse(localStorage.getItem(key)!);
    localStorage.setItem(key, JSON.stringify({ ...rec, policyVersion: "ancienne-version" }));
    expect(consentStatus()).toBe("unknown");
    expect(needsOnboarding()).toBe(true);
  });
});

describe("sélecteur de profils (menu déroulant, choix multiple)", () => {
  it("rend un bouton déroulant fermé avec le résumé des profils cochés", async () => {
    const { ProfilePicker } = await import("@/components/ProfilePicker");
    const html = render(createElement(ProfilePicker, { ids: ["hashimoto", "lupus", "sep"], selected: ["hashimoto", "lupus", "sep"], onToggle: () => {}, label: "Mes profils" }));
    expect(html).toContain('aria-expanded="false"');
    expect(html).toContain('aria-haspopup="true"');
    expect(html).toContain("+1"); // 3 profils : deux noms + « +1 »
    expect(html).not.toContain('type="checkbox"'); // panneau fermé
  });
  it("la page de bienvenue et les Réglages utilisent le même menu", () => {
    expect(read("src/components/Onboarding.tsx")).toContain("<ProfilePicker");
    expect(read("src/app/settings/page.tsx")).toContain("<ProfilePicker");
    expect(read("src/components/ProfilePicker.tsx")).toContain('type="checkbox"'); // plusieurs choix possibles
  });
});
