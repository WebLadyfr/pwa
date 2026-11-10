import { NextResponse, type NextRequest } from "next/server";
import { parseSentryDsn } from "@/lib/sentry-config";

/**
 * CSP stricte avec nonce par requête.
 *  - script-src : 'self' + nonce + 'strict-dynamic' => aucun script inline/tiers non autorisé (anti-XSS).
 *  - connect-src 'self' : le navigateur ne parle qu'à NOTRE serveur (OFF et Claude passent par le backend).
 *  - img-src : images produit d'Open Food Facts uniquement.
 *  - style-src 'unsafe-inline' : seul compromis (styles inline générés par React/Next) ; les scripts restent stricts.
 */
export function middleware(request: NextRequest) {
  const nonce = btoa(crypto.randomUUID());
  const dev = process.env.NODE_ENV !== "production";
  // Seul l'hôte Sentry UE exact du DSN est autorisé (rien de plus large) ; sans DSN valide : rien n'est ajouté.
  const sentryHost = parseSentryDsn(process.env.NEXT_PUBLIC_SENTRY_DSN)?.host;

  const csp = [
    "default-src 'self'",
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'${dev ? " 'unsafe-eval'" : ""}`,
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' blob: data: https://images.openfoodfacts.org https://static.openfoodfacts.org",
    "font-src 'self'",
    "connect-src 'self'" + (sentryHost ? ` https://${sentryHost}` : "") + (dev ? " ws://localhost:* http://localhost:*" : ""),
    "media-src 'self' blob:",
    "worker-src 'self'",
    "manifest-src 'self'",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
    ...(dev ? [] : ["upgrade-insecure-requests"]),
  ].join("; ");

  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-nonce", nonce);
  requestHeaders.set("Content-Security-Policy", csp);

  const response = NextResponse.next({ request: { headers: requestHeaders } });
  response.headers.set("Content-Security-Policy", csp);
  return response;
}

export const config = {
  matcher: [
    { source: "/((?!_next/static|_next/image|favicon.ico|sw.js|theme-init.js|offline.html|manifest.webmanifest|icons/).*)" },
  ],
};
