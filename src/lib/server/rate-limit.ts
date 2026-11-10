/**
 * Rate limiting en mémoire (fenêtre glissante) par IP.
 * LIMITE CONNUE : sur serverless, chaque instance a sa propre mémoire -> protection "best effort".
 * Pour la production à l'échelle : Upstash Redis / Vercel KV (même interface, voir README).
 * L'IP n'est jamais journalisée ni persistée ; elle n'existe qu'en mémoire, le temps de la fenêtre.
 */
const buckets = new Map<string, number[]>();
const MAX_KEYS = 10_000;

export function rateLimit(key: string, limit: number, windowMs: number, now = Date.now()): { ok: boolean; retryAfterSec: number } {
  const hits = (buckets.get(key) ?? []).filter((t) => now - t < windowMs);
  if (hits.length >= limit) {
    buckets.set(key, hits);
    return { ok: false, retryAfterSec: Math.max(1, Math.ceil((windowMs - (now - hits[0]!)) / 1000)) };
  }
  hits.push(now);
  buckets.set(key, hits);
  if (buckets.size > MAX_KEYS) {
    // éviction simple pour borner la mémoire
    for (const [k, v] of buckets) {
      if (v.every((t) => now - t >= windowMs)) buckets.delete(k);
      if (buckets.size <= MAX_KEYS / 2) break;
    }
  }
  return { ok: true, retryAfterSec: 0 };
}

export function clientIp(headers: Headers): string {
  // Sur Vercel, x-forwarded-for est positionné par la plateforme (non falsifiable côté client).
  const xff = headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  return xff || headers.get("x-real-ip") || "unknown";
}

export function intFromEnv(name: string, fallback: number): number {
  const n = Number.parseInt(process.env[name] ?? "", 10);
  return Number.isFinite(n) && n > 0 ? n : fallback;
}

/** Garde-fou de coût : plafond quotidien global (par instance). */
let day = "";
let used = 0;
export function dailyBudgetOk(max: number, now = new Date()): boolean {
  const d = now.toISOString().slice(0, 10);
  if (d !== day) {
    day = d;
    used = 0;
  }
  if (used >= max) return false;
  used += 1;
  return true;
}

export function __resetForTests() {
  buckets.clear();
  day = "";
  used = 0;
}
