import "server-only";

/**
 * Magasin clé/valeur PARTAGÉ entre instances serverless (Upstash Redis / Vercel KV, via l'API REST).
 * Sert au rate limiting, aux quotas et au cache des recettes. Pas de SDK : un `fetch` suffit (une dépendance de moins).
 *
 * Aucune donnée de santé ni contenu utilisateur n'y transite : compteurs, IP HACHÉES (HMAC salé), recettes publiques
 * (clé = code-barres + versions + empreinte des exclusions).
 *
 * En développement (et seulement là, sauf opt-in explicite RECIPES_ALLOW_MEMORY_STORE=true), un magasin en mémoire
 * remplace Redis. En production sans Redis, la fonction recettes est INDISPONIBLE (voir recipes-service.ts) :
 * mieux vaut désactiver une fonction payante en tokens qu'avoir un plafond de coût contournable.
 */
export interface Kv {
  get(key: string): Promise<string | null>;
  set(key: string, value: string, ttlSec: number): Promise<void>;
  /** Incrémente (crée à 1) et (ré)arme l'expiration. */
  incr(key: string, ttlSec: number): Promise<number>;
  decr(key: string): Promise<number>;
}

const TIMEOUT_MS = 3000;

export class UpstashKv implements Kv {
  constructor(private readonly url: string, private readonly token: string) {}

  private async call(commands: (string | number)[][]): Promise<unknown[]> {
    const ctl = new AbortController();
    const timer = setTimeout(() => ctl.abort(), TIMEOUT_MS);
    try {
      const res = await fetch(`${this.url}/pipeline`, {
        method: "POST",
        headers: { Authorization: `Bearer ${this.token}`, "Content-Type": "application/json" },
        body: JSON.stringify(commands),
        signal: ctl.signal,
        cache: "no-store",
      });
      if (!res.ok) throw new Error("kv_http");
      const out = (await res.json()) as { result?: unknown; error?: unknown }[];
      if (!Array.isArray(out) || out.some((o) => o.error !== undefined)) throw new Error("kv_command");
      return out.map((o) => o.result);
    } finally {
      clearTimeout(timer);
    }
  }

  async get(key: string): Promise<string | null> {
    const [r] = await this.call([["GET", key]]);
    return typeof r === "string" ? r : null;
  }
  async set(key: string, value: string, ttlSec: number): Promise<void> {
    await this.call([["SET", key, value, "EX", ttlSec]]);
  }
  async incr(key: string, ttlSec: number): Promise<number> {
    const [n] = await this.call([["INCR", key], ["EXPIRE", key, ttlSec]]);
    return Number(n);
  }
  async decr(key: string): Promise<number> {
    const [n] = await this.call([["DECR", key]]);
    return Number(n);
  }
}

export class MemoryKv implements Kv {
  private readonly m = new Map<string, { v: string; exp: number }>();
  constructor(private readonly now: () => number = Date.now) {}

  private live(key: string): { v: string; exp: number } | undefined {
    const e = this.m.get(key);
    if (e && e.exp <= this.now()) {
      this.m.delete(key);
      return undefined;
    }
    return e;
  }
  async get(key: string) {
    return this.live(key)?.v ?? null;
  }
  async set(key: string, value: string, ttlSec: number) {
    this.m.set(key, { v: value, exp: this.now() + ttlSec * 1000 });
  }
  async incr(key: string, ttlSec: number) {
    const n = Number(this.live(key)?.v ?? 0) + 1;
    this.m.set(key, { v: String(n), exp: this.now() + ttlSec * 1000 });
    return n;
  }
  async decr(key: string) {
    const e = this.live(key);
    const n = Number(e?.v ?? 0) - 1;
    this.m.set(key, { v: String(n), exp: e?.exp ?? this.now() + 60_000 });
    return n;
  }
}

type Env = Record<string, string | undefined>;

export function upstashConfig(env: Env): { url: string; token: string } | null {
  const url = env.UPSTASH_REDIS_REST_URL || env.KV_REST_API_URL;
  const token = env.UPSTASH_REDIS_REST_TOKEN || env.KV_REST_API_TOKEN;
  if (!url || !token) return null;
  try {
    const u = new URL(url);
    if (u.protocol !== "https:") return null; // jamais de jeton en clair
    return { url: u.origin, token };
  } catch {
    return null;
  }
}

let memory: MemoryKv | null = null;

/** Magasin à utiliser, ou null si aucun n'est autorisé dans cet environnement. */
export function getKv(env: Env = process.env): Kv | null {
  const cfg = upstashConfig(env);
  if (cfg) return new UpstashKv(cfg.url, cfg.token);
  if (env.NODE_ENV !== "production" || env.RECIPES_ALLOW_MEMORY_STORE === "true") return (memory ??= new MemoryKv());
  return null;
}
