import { normalizeProductShape } from "./sanitize";
import type { NormalizedProduct } from "./score/types";

export type FetchOutcome =
  | { kind: "ok"; product: NormalizedProduct }
  | { kind: "not_found" }
  | { kind: "offline" }
  | { kind: "rate_limited" }
  | { kind: "upstream" }
  | { kind: "unreadable" }
  | { kind: "invalid_image" }
  | { kind: "error" };

async function handle(res: Response): Promise<FetchOutcome> {
  if (res.ok) {
    const j = (await res.json()) as { product?: unknown };
    const product = normalizeProductShape(j.product);
    return product ? { kind: "ok", product } : { kind: "error" };
  }
  if (res.status === 404) return { kind: "not_found" };
  if (res.status === 429) return { kind: "rate_limited" };
  if (res.status === 422) return { kind: "unreadable" };
  if (res.status === 413 || res.status === 415) return { kind: "invalid_image" };
  if (res.status === 502 || res.status === 503) return { kind: "upstream" };
  return { kind: "error" };
}

export async function fetchProduct(code: string): Promise<FetchOutcome> {
  if (typeof navigator !== "undefined" && !navigator.onLine) return { kind: "offline" };
  try {
    return await handle(await fetch(`/api/product/${encodeURIComponent(code)}`));
  } catch {
    return { kind: "offline" };
  }
}

export async function fetchAlternative(code: string): Promise<{ name: string; brands: string | null; code: string; score: number } | null> {
  try {
    const res = await fetch(`/api/alternatives/${encodeURIComponent(code)}`);
    if (!res.ok) return null;
    const j = (await res.json()) as { alternative?: { product?: unknown; score?: unknown } | null };
    const p = normalizeProductShape(j.alternative?.product);
    const score = j.alternative?.score;
    if (!p || !p.name || !p.code || typeof score !== "number") return null;
    return { name: p.name, brands: p.brands, code: p.code, score: Math.round(score) };
  } catch {
    return null;
  }
}

export async function sendLabelImage(blob: Blob): Promise<FetchOutcome> {
  if (typeof navigator !== "undefined" && !navigator.onLine) return { kind: "offline" };
  try {
    const res = await fetch("/api/label", { method: "POST", headers: { "Content-Type": blob.type }, body: blob });
    return await handle(res);
  } catch {
    return { kind: "offline" };
  }
}

/**
 * Redimensionne (max 1600 px) et ré-encode en JPEG via canvas :
 *  - réduit la taille d'envoi ;
 *  - SUPPRIME les métadonnées EXIF (GPS, appareil...) avant tout envoi.
 */
export async function prepareImage(file: File): Promise<Blob | null> {
  if (!file.type.startsWith("image/")) return null;
  try {
    const bmp = await createImageBitmap(file);
    const scale = Math.min(1, 1600 / Math.max(bmp.width, bmp.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(bmp.width * scale);
    canvas.height = Math.round(bmp.height * scale);
    canvas.getContext("2d")?.drawImage(bmp, 0, 0, canvas.width, canvas.height);
    bmp.close();
    const blob = await new Promise<Blob | null>((r) => canvas.toBlob(r, "image/jpeg", 0.85));
    canvas.width = canvas.height = 0; // libère la mémoire
    return blob && blob.size <= 4 * 1024 * 1024 ? blob : null;
  } catch {
    return null;
  }
}

export type SearchOutcome =
  | { kind: "ok"; products: NormalizedProduct[] }
  | { kind: "invalid" }
  | { kind: "offline" }
  | { kind: "rate_limited" }
  | { kind: "upstream" }
  | { kind: "aborted" };

/** Recherche par nom : POST (terme hors URL), jamais stocké côté client non plus. */
export async function searchByName(q: string, signal: AbortSignal): Promise<SearchOutcome> {
  if (typeof navigator !== "undefined" && !navigator.onLine) return { kind: "offline" };
  try {
    const res = await fetch("/api/search", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ q }),
      signal,
      cache: "no-store",
    });
    if (res.ok) {
      const j = (await res.json()) as { products?: unknown };
      const list = Array.isArray(j.products) ? j.products.slice(0, 20) : [];
      // Revalidation côté client de CHAQUE produit renvoyé (données externes = non fiables).
      const products = list.map(normalizeProductShape).filter((p): p is NormalizedProduct => !!p && !!p.code && !!p.name);
      return { kind: "ok", products };
    }
    if (res.status === 400 || res.status === 413 || res.status === 415) return { kind: "invalid" };
    if (res.status === 429) return { kind: "rate_limited" };
    return { kind: "upstream" };
  } catch (e) {
    return (e as { name?: string })?.name === "AbortError" ? { kind: "aborted" } : { kind: "offline" };
  }
}
