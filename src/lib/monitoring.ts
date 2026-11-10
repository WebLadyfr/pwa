"use client";
import { parseSentryDsn } from "./sentry-config";
import { scrubEvent } from "./sentry-scrub";

/**
 * Rapports d'erreur anonymes (Sentry, région UE). OPT-IN uniquement : rien n'est chargé ni envoyé
 * tant que l'utilisateur n'a pas coché la case dans les Réglages.
 *
 * Réglages volontairement minimaux :
 *  - defaultIntegrations: false  => pas de breadcrumbs (clics, console, fetch/XHR : leurs URLs
 *    contiennent les codes-barres), pas de contexte HTTP (URL de page), pas de sessions ;
 *  - seules les erreurs non interceptées (onerror / unhandledrejection) + dédoublonnage ;
 *  - pas de Session Replay, pas de tracing/performance, pas de PII, pas de client reports ;
 *  - beforeSend => scrubEvent (liste blanche, voir sentry-scrub.ts).
 */
type SentryModule = typeof import("@sentry/browser");
let sentry: SentryModule | null = null;
let starting: Promise<void> | null = null;

export function monitoringAvailable(): boolean {
  return parseSentryDsn(process.env.NEXT_PUBLIC_SENTRY_DSN) !== null;
}

export function startMonitoring(): Promise<void> {
  if (sentry) return Promise.resolve();
  if (starting) return starting;
  const cfg = parseSentryDsn(process.env.NEXT_PUBLIC_SENTRY_DSN);
  if (!cfg) return Promise.resolve();
  starting = import("@sentry/browser")
    .then((S) => {
      S.init({
        dsn: cfg.dsn,
        defaultIntegrations: false,
        integrations: [S.globalHandlersIntegration(), S.dedupeIntegration()],
        // (pas de PII par défaut dans cette version du SDK ; scrubEvent supprime de toute façon user/request)
        tracesSampleRate: 0,
        maxBreadcrumbs: 0,
        beforeBreadcrumb: () => null,
        sendClientReports: false,
        beforeSend: (event) => scrubEvent(event),
      });
      sentry = S;
    })
    .catch(() => { /* échec silencieux : la supervision ne doit jamais casser l'app */ })
    .finally(() => { starting = null; });
  return starting;
}

export async function stopMonitoring(): Promise<void> {
  const s = sentry;
  sentry = null;
  try { await s?.close(); } catch { /* ignore */ }
}

/** No-op tant que l'opt-in n'est pas actif. */
export function reportError(err: unknown): void {
  try { sentry?.captureException(err); } catch { /* ignore */ }
}
