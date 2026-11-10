"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { t } from "@/i18n";
import { monitoringAvailable } from "@/lib/monitoring";
import { DEFAULT_PREFS, TEXT_SIZES, THEMES, getPrefs, setPrefs, type Prefs } from "@/lib/prefs";
import { deleteAllData, getConsent, getProfileId, setConsent, type ConsentRecord } from "@/lib/storage";

export default function SettingsPage() {
  const [consent, setConsentState] = useState<ConsentRecord | null>(null);
  const [prefs, setPrefsState] = useState<Prefs>(DEFAULT_PREFS);
  const [profile, setProfile] = useState("hashimoto");
  const [errorsAvailable, setErrorsAvailable] = useState(false);

  useEffect(() => {
    setConsentState(getConsent());
    setPrefsState(getPrefs());
    setProfile(getProfileId());
    setErrorsAvailable(monitoringAvailable());
  }, []);

  const change = (granted: boolean) => {
    setConsent(granted, profile);
    setConsentState(getConsent());
  };
  const update = (patch: Partial<Prefs>) => setPrefsState(setPrefs(patch));

  const wipe = async () => {
    if (!window.confirm(t("settings.delete.confirm"))) return;
    await deleteAllData(); // l'événement de changement ramène à l'onboarding (qui affiche la confirmation)
  };

  const status =
    consent?.status === "granted"
      ? t("settings.consent.granted", { date: new Date(consent.at).toLocaleDateString("fr-FR") })
      : consent?.status === "refused"
        ? t("settings.consent.refused")
        : t("settings.consent.unknown");

  return (
    <div className="space-y-8">
      <h1 className="text-xl font-semibold">{t("settings.title")}</h1>

      <section aria-labelledby="s-consent" className="space-y-3">
        <h2 id="s-consent" className="text-lg font-semibold">{t("settings.consent")}</h2>
        <p>{t("settings.profile")} : <strong>{t(`profile.${profile}`)}</strong></p>
        <p aria-live="polite">{status}</p>
        {consent?.status === "granted" ? (
          <button type="button" className="btn-secondary" onClick={() => change(false)}>{t("settings.consent.withdraw")}</button>
        ) : (
          <button type="button" className="btn-secondary" onClick={() => change(true)}>{t("settings.consent.enable")}</button>
        )}
        <p className="text-sm text-muted">{t("consent.body")}</p>
        <Link href="/onboarding" className="btn-secondary">{t("settings.onboarding.redo")}</Link>
      </section>

      <section aria-labelledby="s-display" className="space-y-5">
        <h2 id="s-display" className="text-lg font-semibold">{t("settings.display")}</h2>

        <fieldset className="space-y-2">
          <legend className="mb-1 font-medium">{t("settings.theme")}</legend>
          {THEMES.map((v) => (
            <label key={v} className="flex min-h-12 cursor-pointer items-center gap-3 rounded-xl border-2 border-line-strong bg-surface p-3 has-[:checked]:border-primary">
              <input type="radio" name="theme" value={v} checked={prefs.theme === v} onChange={() => update({ theme: v })} className="h-5 w-5 accent-primary" />
              {t(`theme.${v}`)}
            </label>
          ))}
        </fieldset>

        <fieldset className="space-y-2">
          <legend className="mb-1 font-medium">{t("settings.textsize")}</legend>
          <div className="grid grid-cols-2 gap-2">
            {TEXT_SIZES.map((v) => (
              <label key={v} className="flex min-h-12 cursor-pointer items-center gap-3 rounded-xl border-2 border-line-strong bg-surface p-3 has-[:checked]:border-primary">
                <input type="radio" name="textsize" value={v} checked={prefs.textSize === v} onChange={() => update({ textSize: v })} className="h-5 w-5 shrink-0 accent-primary" />
                {t(`text.${v}`)}
              </label>
            ))}
          </div>
          <p className="rounded-xl bg-surface p-3">{t("settings.textsize.sample")}</p>
        </fieldset>
      </section>

      <section aria-labelledby="s-errors" className="space-y-3">
        <h2 id="s-errors" className="text-lg font-semibold">{t("settings.errors")}</h2>
        <label className={`flex min-h-12 items-start gap-3 ${errorsAvailable ? "cursor-pointer" : "opacity-60"}`}>
          <input
            type="checkbox"
            checked={errorsAvailable && prefs.errorReports}
            disabled={!errorsAvailable}
            onChange={(e) => update({ errorReports: e.target.checked })}
            className="mt-1 h-6 w-6 shrink-0 accent-primary"
            aria-describedby="errors-help"
          />
          <span>{t("settings.errors.label")}</span>
        </label>
        <p id="errors-help" className="text-sm text-muted">
          {t("settings.errors.help")}
          {!errorsAvailable && ` ${t("settings.errors.unavailable")}`}
        </p>
      </section>

      <section aria-labelledby="s-delete" className="space-y-3">
        <h2 id="s-delete" className="text-lg font-semibold">{t("settings.delete")}</h2>
        <p>{t("settings.delete.help")}</p>
        <button type="button" onClick={wipe} className="inline-flex min-h-12 w-full items-center justify-center rounded-xl border-2 border-bad-ring bg-bad-bg px-5 py-3 text-lg font-semibold text-bad-fg">
          <span aria-hidden="true">🗑️&nbsp;</span>{t("settings.delete")}
        </button>
      </section>

      <section aria-labelledby="s-legal" className="space-y-2">
        <h2 id="s-legal" className="text-lg font-semibold">{t("settings.legal")}</h2>
        <ul className="list-inside list-disc underline">
          <li><Link href="/privacy">{t("legal.privacy")}</Link></li>
          <li><Link href="/terms">{t("legal.terms")}</Link></li>
          <li><Link href="/legal">{t("legal.notice")}</Link></li>
        </ul>
      </section>
    </div>
  );
}
