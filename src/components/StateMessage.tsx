import Link from "next/link";
import { t } from "@/i18n";
import type { FetchOutcome } from "@/lib/client";

/** Messages d'erreur clairs et génériques pour chaque issue non nominale. */
export function StateMessage({ kind, onRetry }: { kind: Exclude<FetchOutcome["kind"], "ok">; onRetry?: () => void }) {
  const map: Record<string, { title: string; body: string }> = {
    not_found: { title: t("error.notFound.title"), body: t("error.notFound.body") },
    offline: { title: t("error.offline.title"), body: t("error.offline.body") },
    upstream: { title: t("error.upstream.title"), body: t("error.upstream.body") },
    rate_limited: { title: t("error.generic.title"), body: t("error.rateLimited.body") },
    unreadable: { title: t("error.generic.title"), body: t("label.error.unreadable") },
    invalid_image: { title: t("error.generic.title"), body: t("label.error.invalid") },
    error: { title: t("error.generic.title"), body: t("error.generic.body") },
  };
  const m = map[kind] ?? map.error!;
  return (
    <section role="alert" className="space-y-3 rounded-2xl border-2 border-line-strong bg-surface p-5">
      <h1 className="text-xl font-semibold">{m.title}</h1>
      <p>{m.body}</p>
      <div className="flex flex-col gap-3 sm:flex-row">
        {kind === "not_found" && <Link href="/label" className="btn-primary">{t("result.insufficient.cta")}</Link>}
        {onRetry && kind !== "not_found" && <button type="button" onClick={onRetry} className="btn-primary">{t("error.retry")}</button>}
        <Link href="/" className="btn-secondary">{t("result.back")}</Link>
      </div>
    </section>
  );
}
