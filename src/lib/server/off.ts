import "server-only";
import { OFF_FIELDS, mapOffProduct } from "@/lib/sanitize";
import { toOffQuery } from "@/lib/search-input";
import type { NormalizedProduct } from "@/lib/score/types";

/**
 * Appels Open Food Facts : faits côté SERVEUR uniquement car
 *  - un navigateur ne peut pas définir le header User-Agent (OFF exige d'identifier l'app) ;
 *  - l'IP de l'utilisateur n'est pas transmise à un tiers ;
 *  - la CSP du site peut rester `connect-src 'self'`.
 */
const BASE = "https://world.openfoodfacts.org";
const TIMEOUT_MS = 8000;

function userAgent(): string {
  return process.env.OFF_USER_AGENT || "HashimotoScan/0.1 (contact non configuré)";
}

async function offFetch(path: string): Promise<Response> {
  const ctl = new AbortController();
  const timer = setTimeout(() => ctl.abort(), TIMEOUT_MS);
  try {
    return await fetch(`${BASE}${path}`, {
      headers: { "User-Agent": userAgent(), Accept: "application/json" },
      signal: ctl.signal,
      next: { revalidate: 3600 },
    });
  } finally {
    clearTimeout(timer);
  }
}

export type OffLookup =
  | { kind: "ok"; product: NormalizedProduct }
  | { kind: "not_found" }
  | { kind: "upstream_error" };

export async function lookupProduct(code: string): Promise<OffLookup> {
  try {
    const res = await offFetch(`/api/v2/product/${encodeURIComponent(code)}.json?fields=${OFF_FIELDS}`);
    if (res.status === 404) return { kind: "not_found" };
    if (!res.ok) return { kind: "upstream_error" };
    const json: unknown = await res.json();
    const j = json as { status?: unknown; product?: unknown };
    if (j.status !== 1 || typeof j.product !== "object" || j.product === null) return { kind: "not_found" };
    return { kind: "ok", product: mapOffProduct({ ...(j.product as object), code }) };
  } catch {
    return { kind: "upstream_error" };
  }
}

/** Candidats d'une même catégorie (la plus spécifique), populaires en France. */
export async function searchCandidates(categoryTag: string): Promise<NormalizedProduct[]> {
  if (!/^[a-z]{2,3}:[a-z0-9-]{1,80}$/.test(categoryTag)) return [];
  try {
    const qs = new URLSearchParams({
      categories_tags: categoryTag,
      countries_tags_en: "france",
      sort_by: "unique_scans_n",
      page_size: "24",
      fields: OFF_FIELDS,
    });
    const res = await offFetch(`/api/v2/search?${qs.toString()}`);
    if (!res.ok) return [];
    const json = (await res.json()) as { products?: unknown };
    if (!Array.isArray(json.products)) return [];
    return json.products.slice(0, 24).map(mapOffProduct);
  } catch {
    return [];
  }
}

const SEARCH_BASE = "https://search.openfoodfacts.org";

export type OffSearch =
  | { kind: "ok"; products: NormalizedProduct[] }
  | { kind: "upstream_error" };

/**
 * Recherche texte (search-a-licious). `q` DOIT avoir été validée par normalizeQuery.
 * Aucune journalisation du terme : ni ici, ni ailleurs (et la route est en POST pour que
 * le terme n'apparaisse pas dans l'URL, donc pas dans les journaux d'accès de l'hébergeur).
 */
export async function searchProducts(q: string): Promise<OffSearch> {
  const ctl = new AbortController();
  const timer = setTimeout(() => ctl.abort(), TIMEOUT_MS);
  try {
    const qs = new URLSearchParams({ q: toOffQuery(q), page_size: "20", langs: "fr", fields: OFF_FIELDS });
    const res = await fetch(`${SEARCH_BASE}/search?${qs.toString()}`, {
      headers: { "User-Agent": userAgent(), Accept: "application/json" },
      signal: ctl.signal,
      cache: "no-store", // jamais de cache de données liées à une requête utilisateur
    });
    if (!res.ok) return { kind: "upstream_error" };
    const json = (await res.json()) as { hits?: unknown };
    if (!Array.isArray(json.hits)) return { kind: "upstream_error" };
    const products = json.hits
      .slice(0, 20)
      .map(mapOffProduct)
      .filter((p) => p.code !== null && p.name !== null);
    return { kind: "ok", products };
  } catch {
    return { kind: "upstream_error" };
  } finally {
    clearTimeout(timer);
  }
}
