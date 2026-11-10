/**
 * Nettoyage des rapports d'erreur AVANT envoi (beforeSend). Fonction pure, sans dépendance à Sentry.
 *
 * Approche : LISTE BLANCHE. On ne reconstruit l'événement qu'avec des champs sûrs ; tout le reste
 * (utilisateur, requête/URL, breadcrumbs, extra, contexts, tags, transaction...) est supprimé.
 * Un nouveau champ ajouté un jour par le SDK est donc exclu par défaut, pas inclus par défaut.
 *
 * Ce qui ne doit JAMAIS sortir : code-barres, nom de produit, terme de recherche, profil, favoris,
 * contenu de localStorage/IndexedDB, IP, URL de page.
 */
type Json = Record<string, unknown>;

const URL_TAIL_RE = /\b(?:https?|ftp|blob|file|data):.*$/is; // une URL et TOUT ce qui suit (une URL non encodée peut contenir des espaces)
const QUOTED_RE = /(["'`])(?:(?!\1)[^\n]){0,200}\1|«[^»]{0,200}»|[“‘][^”’]{0,200}[”’]/g;
const LONG_DIGITS_RE = /\d{6,}/g; // code-barres (EAN-8 à GTIN-14), identifiants

/** Message d'erreur : retire les URLs (et la fin du message après elles), textes entre guillemets (où se logent les valeurs), longues suites de chiffres. */
export function scrubText(s: unknown, max = 200): string {
  if (typeof s !== "string") return "";
  return s.replace(URL_TAIL_RE, "[url]").replace(QUOTED_RE, "[…]").replace(LONG_DIGITS_RE, "[n]").slice(0, max);
}

/** Garde seulement le CHEMIN du fichier de notre bundle (sans domaine ni paramètres). */
function scrubFilename(f: unknown): string | undefined {
  if (typeof f !== "string") return undefined;
  try {
    return new URL(f).pathname.slice(0, 200);
  } catch {
    return scrubText(f);
  }
}

const isObj = (x: unknown): x is Json => typeof x === "object" && x !== null && !Array.isArray(x);
const num = (x: unknown) => (typeof x === "number" && Number.isFinite(x) ? x : undefined);

function scrubFrame(f: unknown): Json | null {
  if (!isObj(f)) return null;
  // Pas de abs_path, vars, context_line, pre/post_context : seulement où dans NOTRE code.
  return { filename: scrubFilename(f.filename), function: typeof f.function === "string" ? f.function.slice(0, 120) : undefined, lineno: num(f.lineno), colno: num(f.colno), in_app: f.in_app === true };
}

function scrubException(values: unknown): Json[] {
  if (!Array.isArray(values)) return [];
  return values.slice(0, 5).filter(isObj).map((v) => {
    const frames = isObj(v.stacktrace) && Array.isArray(v.stacktrace.frames) ? v.stacktrace.frames.slice(-30).map(scrubFrame).filter(Boolean) : [];
    return {
      type: scrubText(v.type, 80),
      value: scrubText(v.value),
      mechanism: isObj(v.mechanism) ? { type: scrubText(v.mechanism.type, 40), handled: v.mechanism.handled === true } : undefined,
      stacktrace: { frames },
    };
  });
}

function pick(o: unknown, keys: string[]): Json | undefined {
  if (!isObj(o)) return undefined;
  const out: Json = {};
  for (const k of keys) if (typeof o[k] === "string") out[k] = scrubText(o[k], 40);
  return Object.keys(out).length ? out : undefined;
}

export function scrubEvent<T extends object>(event: T): T {
  const ev = event as Json;
  const out: Json = {};
  for (const k of ["event_id", "timestamp", "platform", "level", "environment", "release"]) {
    if (typeof ev[k] === "string" || typeof ev[k] === "number") out[k] = ev[k];
  }
  if (isObj(ev.sdk)) out.sdk = { name: scrubText(ev.sdk.name, 60), version: scrubText(ev.sdk.version, 20) };
  if (typeof ev.message === "string") out.message = scrubText(ev.message);
  if (isObj(ev.exception)) out.exception = { values: scrubException(ev.exception.values) };
  // Contexte technique minimal et générique (utile au diagnostic, non identifiant).
  if (isObj(ev.contexts)) {
    const browser = pick(ev.contexts.browser, ["name", "version"]);
    const os = pick(ev.contexts.os, ["name"]);
    if (browser || os) out.contexts = { ...(browser ? { browser } : {}), ...(os ? { os } : {}) };
  }
  return out as T;
}
