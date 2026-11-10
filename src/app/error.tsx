"use client";
import { useEffect } from "react";
import { t } from "@/i18n";
import { reportError } from "@/lib/monitoring";

/** Erreur de rendu : message générique (aucun détail technique affiché) ; rapport seulement si opt-in. */
export default function ErrorPage({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => reportError(error), [error]);
  return (
    <section role="alert" className="space-y-3 rounded-2xl border-2 border-line-strong bg-surface p-5">
      <h1 className="text-xl font-semibold">{t("error.boundary.title")}</h1>
      <p>{t("error.boundary.body")}</p>
      <button type="button" onClick={reset} className="btn-primary">{t("error.retry")}</button>
    </section>
  );
}
