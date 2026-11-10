import { NextResponse } from "next/server";

/** Réponses d'erreur GÉNÉRIQUES : aucun détail interne, aucune stack, aucun écho d'entrée. */
export function jsonError(status: number, code: string, extraHeaders?: Record<string, string>) {
  return NextResponse.json({ error: code }, { status, headers: { "Cache-Control": "no-store", ...extraHeaders } });
}

/** Même origine uniquement (anti-CSRF / anti-usage tiers de nos routes coûteuses). */
export function sameOrigin(req: Request): boolean {
  const origin = req.headers.get("origin");
  if (!origin) return false;
  try {
    return new URL(origin).host === req.headers.get("host");
  } catch {
    return false;
  }
}
