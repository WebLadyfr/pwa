import { describe, expect, it } from "vitest";
import { scrubEvent, scrubText } from "./sentry-scrub";
import { parseSentryDsn } from "./sentry-config";

/** Événement « pire cas » : tout ce que le SDK pourrait joindre, bourré de données sensibles. */
function hostileEvent() {
  return {
    event_id: "abc123",
    level: "error",
    platform: "javascript",
    environment: "production",
    message: "Échec pour le produit 'Nutella' code 3017620422003",
    exception: {
      values: [
        {
          type: "TypeError",
          value: "Cannot read properties of 'Nutella Biscuit' at https://app.test/product/3017620422003?q=biscuit chocolat",
          mechanism: { type: "onerror", handled: false, data: { secret: "ZZZ-MECH" } },
          stacktrace: {
            frames: [
              {
                filename: "https://app.test/_next/static/chunks/page.js?token=SECRET-TOKEN",
                abs_path: "https://app.test/product/3017620422003",
                function: "onClick",
                lineno: 12,
                colno: 7,
                in_app: true,
                vars: { name: "Nutella", code: "3017620422003" },
                context_line: "const name = 'Nutella'",
                pre_context: ["favori: 3017620422003"],
                post_context: ["recherche: biscuit chocolat"],
              },
            ],
          },
        },
      ],
    },
    user: { id: "u-42", ip_address: "203.0.113.9", email: "x@y.z" },
    request: {
      url: "https://app.test/product/3017620422003",
      query_string: "q=biscuit chocolat",
      headers: { Referer: "https://app.test/search?q=biscuit", "User-Agent": "UA-SECRET", Cookie: "c=1" },
    },
    breadcrumbs: [
      { category: "fetch", data: { url: "/api/product/3017620422003" } },
      { category: "ui.click", message: "button.favorite[aria-label='Retirer des favoris']" },
    ],
    extra: {
      localStorage: '{"hs:v1:profile":{"id":"hashimoto"},"hs:v1:favorites":[{"code":"3017620422003"}]}',
      indexedDB: "dump",
      favorites: ["3017620422003"],
    },
    tags: { profile: "hashimoto", search: "biscuit chocolat" },
    transaction: "/product/3017620422003",
    server_name: "ma-machine-perso",
    modules: { lib: "1.0" },
    fingerprint: ["3017620422003"],
    contexts: {
      browser: { name: "Chrome", version: "130.0", extra: "x-browser-secret" },
      os: { name: "Android", version: "14", build: "x-os-secret" },
      device: { model: "Pixel 9", family: "Pixel" },
      state: { value: { profile: "hashimoto" } },
      culture: { locale: "fr-FR", timezone: "Europe/Paris" },
    },
    sdk: { name: "sentry.javascript.browser", version: "11.11.0", packages: [{ name: "npm:@sentry/browser" }] },
  };
}

const FORBIDDEN = [
  "3017620422003", // code-barres
  "Nutella", // nom de produit
  "biscuit", "chocolat", // terme de recherche
  "hashimoto", // profil
  "favorite", "favori", "favoris", // favoris
  "localStorage", "indexedDB", "hs:v1", // contenu du stockage local
  "203.0.113.9", "x@y.z", "u-42", // IP / identité
  "SECRET", "ZZZ-MECH", "UA-SECRET", "Referer", "Cookie", // en-têtes, jetons
  "app.test", "ma-machine-perso", "Pixel", // URL de page, hôte, appareil
  "x-browser-secret", "x-os-secret",
  "culture", "Europe/Paris",
];

describe("nettoyage des rapports d'erreur (beforeSend)", () => {
  const out = scrubEvent(hostileEvent());
  const json = JSON.stringify(out);

  it("aucune donnée sensible ne sort", () => {
    for (const bad of FORBIDDEN) expect(json, `fuite : ${bad}`).not.toContain(bad);
  });

  it("supprime les champs entiers (liste blanche) : user, request, breadcrumbs, extra, tags, transaction...", () => {
    const o = out as Record<string, unknown>;
    for (const k of ["user", "request", "breadcrumbs", "extra", "tags", "transaction", "server_name", "modules", "fingerprint"]) {
      expect(o, k).not.toHaveProperty(k);
    }
  });

  it("garde l'utile au diagnostic : type d'erreur, fonction, ligne, fichier du bundle, navigateur/OS génériques", () => {
    const o = out as unknown as {
      level: string;
      exception: { values: { type: string; stacktrace: { frames: { filename: string; function: string; lineno: number; colno: number }[] } }[] };
      contexts: Record<string, Record<string, string>>;
    };
    expect(o.level).toBe("error");
    expect(o.exception.values[0]!.type).toBe("TypeError");
    expect(o.exception.values[0]!.stacktrace.frames[0]).toMatchObject({ filename: "/_next/static/chunks/page.js", function: "onClick", lineno: 12, colno: 7 });
    expect(o.contexts.browser).toEqual({ name: "Chrome", version: "130.0" });
    expect(o.contexts.os).toEqual({ name: "Android" });
    expect(Object.keys(o.contexts).sort()).toEqual(["browser", "os"]);
  });

  it("un champ inconnu ajouté plus tard par le SDK est exclu par défaut", () => {
    const o = scrubEvent({ ...hostileEvent(), nouveau_champ_du_sdk: { donnee: "3017620422003" } });
    expect(JSON.stringify(o)).not.toContain("3017620422003");
    expect(o).not.toHaveProperty("nouveau_champ_du_sdk");
  });

  it("ne plante pas sur des événements malformés", () => {
    for (const bad of [{}, { exception: "x" }, { exception: { values: [null, 3, "x", { stacktrace: 5 }] } }, { contexts: 3 }, { message: 12 }]) {
      expect(() => scrubEvent(bad)).not.toThrow();
    }
  });
});

describe("scrubText", () => {
  it("retire URLs, textes entre guillemets et longues suites de chiffres", () => {
    expect(scrubText("GET https://x.test/api/product/3017620422003 failed")).toBe("GET [url]");
    // URL non encodée contenant un espace : la fin du terme de recherche ne doit pas fuiter
    expect(scrubText("fetch https://x.test/s?q=biscuit chocolat")).toBe("fetch [url]");
    expect(scrubText("bad value 'Nutella' and \"biscuit\" and «crème»")).toBe("bad value […] and […] and […]");
    expect(scrubText("code 30176204220 / 12345")).toBe("code [n] / 12345");
  });
  it("tronque les messages longs", () => {
    expect(scrubText("x".repeat(1000)).length).toBe(200);
  });
});

describe("DSN Sentry : région UE uniquement", () => {
  const eu = "https://abcdef0123456789abcdef0123456789@o123456.ingest.de.sentry.io/4506789";
  it("accepte un DSN UE et en extrait l'hôte exact (pour la CSP)", () => {
    expect(parseSentryDsn(eu)).toEqual({ dsn: eu, host: "o123456.ingest.de.sentry.io" });
  });
  it("refuse tout le reste : Sentry reste désactivé", () => {
    for (const v of [
      undefined, null, "", "pas un dsn",
      "https://abcdef0123456789@o123.ingest.sentry.io/1", // région US par défaut
      "https://abcdef0123456789@o123.ingest.us.sentry.io/1", // US explicite
      "https://abcdef0123456789@o123.ingest.de.sentry.io.evil.com/1", // détournement de domaine
      "https://abcdef0123456789@evil.com/1",
      "http://abcdef0123456789@o123.ingest.de.sentry.io/1", // pas HTTPS
      "https://abcdef0123456789@o123.ingest.de.sentry.io/1?x=1",
      "https://abcdef0123456789@*.ingest.de.sentry.io/1",
    ]) {
      expect(parseSentryDsn(v as string), String(v)).toBeNull();
    }
  });
});
