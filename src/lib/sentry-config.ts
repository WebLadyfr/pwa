/**
 * Lecture et validation du DSN Sentry (variable d'environnement NEXT_PUBLIC_SENTRY_DSN).
 *
 * Un DSN n'est PAS un secret : il ne permet qu'ENVOYER des événements (c'est pourquoi il est
 * lisible côté navigateur). Il est néanmoins fourni uniquement par variable d'environnement,
 * jamais écrit dans le code ni dans Git.
 *
 * On n'accepte QUE la région UE (`*.ingest.de.sentry.io`) : un DSN d'une autre région est ignoré,
 * donc Sentry reste désactivé plutôt que d'envoyer des données hors UE par erreur de configuration.
 * L'hôte exact du DSN sert aussi à construire la CSP (connect-src) : rien de plus large.
 */
const EU_DSN = /^https:\/\/([A-Za-z0-9]{8,64})@(o\d{1,12}\.ingest\.de\.sentry\.io)\/(\d{1,12})$/;

export function parseSentryDsn(dsn: string | undefined | null): { dsn: string; host: string } | null {
  if (!dsn) return null;
  const m = EU_DSN.exec(dsn.trim());
  return m ? { dsn: dsn.trim(), host: m[2]! } : null;
}
