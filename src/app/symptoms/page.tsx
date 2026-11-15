"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { DayBars } from "@/components/DayBars";
import { Icon, type IconName } from "@/components/Icon";
import { dateLocale, t } from "@/i18n";
import { CHANGE_EVENT, consentStatus } from "@/lib/storage";
import {
  SYMPTOM_KEYS, daysTrackedLast7, dayKey, getSymptoms, last7Days, saveSymptomEntry, type SymptomEntry, type SymptomKey,
} from "@/lib/tracking";

const SCALE = [1, 2, 3, 4, 5] as const;
type Draft = Partial<Record<SymptomKey, number>>;

/**
 * Suivi des symptômes : 5 repères notés de 1 à 5, une saisie par jour. Données de santé : enregistrées sur l'appareil
 * seulement avec l'accord local (sinon on explique comment l'activer), effacées avec « Supprimer toutes mes données ».
 */
export default function SymptomsPage() {
  const [entries, setEntries] = useState<SymptomEntry[] | null>(null);
  const [enabled, setEnabled] = useState(false);
  const [draft, setDraft] = useState<Draft>({});
  const [saved, setSaved] = useState(false);
  const today = dayKey();

  useEffect(() => {
    const load = () => {
      setEnabled(consentStatus() === "granted");
      const all = getSymptoms();
      setEntries(all);
      const todayEntry = all.find((e) => e.date === dayKey());
      if (todayEntry) setDraft((d) => (Object.keys(d).length === 0 ? { ...todayEntry.scores } : d));
    };
    load();
    window.addEventListener(CHANGE_EVENT, load);
    return () => window.removeEventListener(CHANGE_EVENT, load);
  }, []);

  if (entries === null) return null;

  const complete = SYMPTOM_KEYS.every((k) => typeof draft[k] === "number");
  const days7 = daysTrackedLast7(entries);
  const weekDays = last7Days(entries).map((d) => ({
    key: d.key, avg: d.avg,
    short: d.date.toLocaleDateString(dateLocale(), { weekday: "narrow" }),
    long: d.date.toLocaleDateString(dateLocale(), { weekday: "long" }),
  }));

  const save = (e: React.FormEvent) => {
    e.preventDefault();
    if (!complete) return;
    const ok = saveSymptomEntry({ date: today, scores: draft as Record<SymptomKey, number> });
    setSaved(ok);
  };

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold">{t("symptoms.title")}</h1>
      <p>{t("symptoms.intro")}</p>

      {!enabled ? (
        <p role="note" className="rounded-xl border-2 border-warn-ring bg-warn-bg p-3 text-warn-fg">
          {t("symptoms.disabled")} <Link href="/settings" className="underline">{t("nav.settings")}</Link>
        </p>
      ) : (
        <>
          <section aria-labelledby="sy-week" className="space-y-2 rounded-2xl bg-surface p-4 shadow-sm">
            <h2 id="sy-week" className="font-semibold">{t("symptoms.week")}</h2>
            <DayBars label={t("symptoms.week")} days={weekDays} valueText={(d) => `${d.long} : ${d.avg === null ? t("symptoms.none") : d.avg.toFixed(1)}`} />
            <p className="text-sm text-muted">{t("symptoms.week.count", { n: days7 })}</p>
          </section>

          <form onSubmit={save} className="space-y-5">
            {SYMPTOM_KEYS.map((k) => (
              <fieldset key={k} className="space-y-2">
                <legend className="mb-1 font-medium">{t(`symptoms.${k}`)}</legend>
                <div className="grid grid-cols-5 gap-1.5">
                  {SCALE.map((n) => (
                    <label
                      key={n}
                      className="press flex min-h-12 cursor-pointer flex-col items-center justify-center rounded-3xl border-2 border-line-strong bg-surface text-center has-[:checked]:border-primary has-[:checked]:bg-primary has-[:checked]:text-on-primary"
                    >
                      <input
                        type="radio"
                        name={k}
                        value={n}
                        checked={draft[k] === n}
                        onChange={() => { setDraft((d) => ({ ...d, [k]: n })); setSaved(false); }}
                        className="sr-only"
                      />
                      <Icon name={`face${n}` as IconName} className="h-6 w-6" />
                      <span className="text-sm font-semibold">{n}</span>
                    </label>
                  ))}
                </div>
              </fieldset>
            ))}
            <p className="text-sm text-muted">{t("symptoms.scale")}</p>
            <button type="submit" disabled={!complete} className="btn-primary disabled:cursor-not-allowed disabled:opacity-50">
              {t("symptoms.save")}
            </button>
            {!complete && <p className="text-sm text-muted">{t("symptoms.incomplete")}</p>}
            {saved && <p role="status" className="font-medium text-ok-fg"><Icon name="check" className="me-1 h-4 w-4 align-[-0.15em]" />{t("symptoms.saved")}</p>}
          </form>

          <section aria-labelledby="sy-hist" className="space-y-2">
            <h2 id="sy-hist" className="text-lg font-semibold">{t("symptoms.history")}</h2>
            {entries.length === 0 ? (
              <p>{t("symptoms.empty")}</p>
            ) : (
              <ul className="space-y-2">
                {entries.slice(0, 7).map((e) => (
                  <li key={e.date} className="rounded-xl bg-surface p-3 shadow-sm">
                    <p className="font-medium">{new Date(`${e.date}T12:00:00`).toLocaleDateString(dateLocale(), { weekday: "long", day: "numeric", month: "long" })}</p>
                    <p className="text-sm text-muted">
                      {SYMPTOM_KEYS.map((k) => `${t(`symptoms.${k}.short`)} ${e.scores[k]}/5`).join(" · ")}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </>
      )}

      <p role="note" className="text-sm text-muted">{t("symptoms.disclaimer")}</p>
    </div>
  );
}
