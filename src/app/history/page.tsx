"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { t } from "@/i18n";
import { consentStatus, getHistory, type HistoryEntry } from "@/lib/storage";

const ICON = { green: "✔", orange: "▲", red: "✖" } as const;
const COLOR = { green: "text-ok-fg", orange: "text-warn-fg", red: "text-bad-fg" } as const;

export default function HistoryPage() {
  const [entries, setEntries] = useState<HistoryEntry[] | null>(null);
  const [enabled, setEnabled] = useState(false);

  useEffect(() => {
    setEnabled(consentStatus() === "granted");
    setEntries(getHistory());
  }, []);

  if (entries === null) return null;

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">{t("history.title")}</h1>
      {!enabled && <p>{t("history.disabled")} <Link href="/settings" className="underline">{t("nav.settings")}</Link></p>}
      {enabled && entries.length === 0 && <p>{t("history.empty")}</p>}
      <ul className="space-y-2">
        {entries.map((e) => {
          const label = e.name ?? t("result.unknownName");
          const inner = (
            <>
              <span className="min-w-0 flex-1">
                <span className="block truncate font-medium">{label}</span>
                <span className="block text-sm text-muted">{new Date(e.at).toLocaleDateString("fr-FR")}</span>
              </span>
              {e.level && e.score !== null ? (
                <span className={`shrink-0 font-bold ${COLOR[e.level]}`}>
                  <span aria-hidden="true">{ICON[e.level]} </span>
                  {e.score}/100 <span className="sr-only">{t(`level.${e.level}`)}</span>
                </span>
              ) : (
                <span className="shrink-0 text-muted">{t("history.insufficient")}</span>
              )}
            </>
          );
          return (
            <li key={e.id}>
              {e.code ? (
                <Link href={`/product/${e.code}`} className="flex min-h-14 items-center gap-3 rounded-xl bg-surface p-3 shadow-sm">{inner}</Link>
              ) : (
                <div className="flex min-h-14 items-center gap-3 rounded-xl bg-surface p-3 shadow-sm">{inner}</div>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
