import { beforeEach, describe, expect, it } from "vitest";
import { __resetForTests, dailyBudgetOk, rateLimit } from "./rate-limit";
import { parseModelOutput, sniffImageType } from "./label";

beforeEach(() => __resetForTests());

describe("rate limit", () => {
  it("bloque au-delà de la limite puis libère après la fenêtre", () => {
    const t0 = 1_000_000;
    for (let i = 0; i < 3; i++) expect(rateLimit("ip", 3, 60_000, t0 + i).ok).toBe(true);
    const blocked = rateLimit("ip", 3, 60_000, t0 + 10);
    expect(blocked.ok).toBe(false);
    expect(blocked.retryAfterSec).toBeGreaterThan(0);
    expect(rateLimit("ip", 3, 60_000, t0 + 61_000).ok).toBe(true);
  });
  it("isole les IP entre elles", () => {
    rateLimit("a", 1, 60_000, 1);
    expect(rateLimit("a", 1, 60_000, 2).ok).toBe(false);
    expect(rateLimit("b", 1, 60_000, 2).ok).toBe(true);
  });
  it("plafond quotidien", () => {
    expect(dailyBudgetOk(2)).toBe(true);
    expect(dailyBudgetOk(2)).toBe(true);
    expect(dailyBudgetOk(2)).toBe(false);
  });
});

describe("validation d'image (magic bytes)", () => {
  it("reconnaît JPEG / PNG / WebP", () => {
    expect(sniffImageType(new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 0]))).toBe("image/jpeg");
    expect(sniffImageType(new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0]))).toBe("image/png");
    const webp = new Uint8Array([...Buffer.from("RIFF"), 0, 0, 0, 0, ...Buffer.from("WEBP"), 0]);
    expect(sniffImageType(webp)).toBe("image/webp");
  });
  it("refuse HTML / SVG / exécutables déguisés", () => {
    expect(sniffImageType(Buffer.from("<svg onload=alert(1)>"))).toBeNull();
    expect(sniffImageType(Buffer.from("MZ\u0090\u0000\u0003"))).toBeNull();
    expect(sniffImageType(new Uint8Array([]))).toBeNull();
  });
});

describe("sortie du modèle (non fiable)", () => {
  it("accepte un JSON valide et ne garde que des tags valides", () => {
    const r = parseModelOutput(
      'Voici : {"readable":true,"name":"<b>Biscuit</b>","ingredients":["en:wheat","<script>"],"additives":["en:e471"],"allergens":["en:gluten"],"traces":[],"nova":4}',
    );
    expect(r.kind).toBe("ok");
    if (r.kind !== "ok") return;
    expect(r.product.ingredientsTags).toEqual(["en:wheat"]);
    expect(r.product.name).not.toMatch(/[<>]/);
    expect(r.product.novaGroup).toBe(4);
  });
  it("illisible => unreadable", () => {
    expect(parseModelOutput('{"readable":false,"ingredients":[]}').kind).toBe("unreadable");
    expect(parseModelOutput('{"readable":true,"ingredients":["pas un tag"]}').kind).toBe("unreadable");
  });
  it("sortie non JSON => error (jamais d'exception)", () => {
    expect(parseModelOutput("désolé, je ne peux pas").kind).toBe("error");
    expect(parseModelOutput("{cassé").kind).toBe("error");
  });
});
