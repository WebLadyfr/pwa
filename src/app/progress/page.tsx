"use client";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { BarChart } from "@/components/BarChart";
import { dateLocale, t } from "@/i18n";
import { buildBuckets, type Bucket, type Period } from "@/lib/progress";
import { CHANGE_EVENT, consentStatus } from "@/lib/storage";
import { getStats, getSymptoms } from "@/lib/tracking";

const PERIODS: Period[] = ["week", "month", "year"];

function labelFor(period: Period, b: Bucket): string {
  const loc = dateLocale();
  if (period === "week") return b.start.toLocaleDateString(loc, { weekday: "narrow" });
  if (period === "month") return b.start.toLocaleDateString(loc, { day: "numeric", month: "short" }).replace(/\.$/, "");
  return b.start.toLocaleDateString(loc, { month: "narrow" });
}
function longLabel(period: Period, b: Bucket): string {
  const loc = dateLocale();
  if (period === "week") return b.start.toLocaleDateString(loc, { weekday: "long", day: "numeric", month: "long" });
  if (period === "month") return `${b.start.toLocaleDateString(loc, { day: "numeric", month: "long" })} – ${b.end.toLocaleDateString(loc, { day: "numeric", month: "long" })}`;
  return b.start.toLocaleDateString(loc, { month: "long", year: "numeric" });
}

/** Progression dans le temps : scans, recettes générées, jours de suivi des symptômes (semaine / mois / année). */
export default function ProgressPage() {
  const [period, setPeriod] = useState<Period>("week");
  const [data, setData] = useState<{ enabled: boolean; scanDays: Record<string, number>; recipeDays: Record<string, number>; symptomDays: Record<string, number> }>({
    enabled: false, scanDays: {}, recipeDays: {}, symptomDays: {},
  });

  useEffect(() => {
    const load = () => {
      const enabled = consentStatus() === "granted";
      if (!enabled) return setData({ enabled, scanDays: {}, recipeDays: {}, symptomDays: {} });
      const s = getStats();
      setData({ enabled, scanDays: s.scanDays, recipeDays: s.recipeDays, symptomDays: Object.fromEntries(getSymptoms().map((e) => [e.date, 1])) });
    };
    load();
    window.addEventListener(CHANGE_EVENT, load);
    return () => window.removeEventListener(CHANGE_EVENT, load);
  }, []);

  const series = useMemo(() => {
    const mk = (perDay: Record<string, number>) => {
      const b = buildBuckets(period, perDay);
      return { items: b.map((x) => ({ key: x.key, label: labelFor(period, x), long: longLabel(period, x), value: x.value })), total: b.reduce((s, x) => s + x.value, 0) };
    };
    return { scans: mk(data.scanDays), recipes: mk(data.recipeDays), symptoms: mk(data.symptomDays) };
  }, [period, data]);

  const charts = [
    { id: "scans", title: t("progress.scans"), unit: t("progress.unit.scans"), s: series.scans },
    { id: "recipes", title: t("progress.recipes"), unit: t("progress.unit.recipes"), s: series.recipes },
    { id: "symptoms", title: t("progress.symptoms"), unit: t("progress.unit.symptoms"), s: series.symptoms },
  ];

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold">{t("progress.title")}</h1>

      <div role="tablist" aria-label={t("progress.period")} className="grid grid-cols-3 gap-1 rounded-full border-2 border-line bg-surface p-1">
        {PERIODS.map((p) => (
          <button
            key={p}
            type="button"
            role="tab"
            aria-selected={period === p}
            onClick={() => setPeriod(p)}
            className={`press min-h-10 rounded-full px-2 text-sm font-semibold ${period === p ? "bg-primary text-on-primary" : "text-primary"}`}
          >
            {t(`progress.${p}`)}
          </button>
        ))}
      </div>

      {!data.enabled ? (
        <p className="rounded-2xl bg-surface p-4">{t("dash.disabled")} <Link href="/settings" className="underline">{t("nav.settings")}</Link></p>
      ) : (
        <>
          <p className="text-sm text-muted">{t(`progress.${period}.help`)}</p>
          {charts.map((c) => (
            <section key={c.id} aria-labelledby={`pg-${c.id}`} className="space-y-3 rounded-2xl bg-surface p-4 shadow-sm">
              <div className="flex items-baseline justify-between gap-3">
                <h2 id={`pg-${c.id}`} className="font-semibold">{c.title}</h2>
                <span className="shrink-0 text-sm font-semibold tabular-nums">{t("progress.total", { n: c.s.total })}</span>
              </div>
              <BarChart label={c.title} unit={c.unit} items={c.s.items} />
            </section>
          ))}
          <p className="text-sm text-muted">{t("progress.note")}</p>
        </>
      )}
    </div>
  );
}
