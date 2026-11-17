"use client";
import { Icon } from "@/components/Icon";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Modal } from "@/components/Modal";
import { dateLocale, t } from "@/i18n";
import { monitoringAvailable } from "@/lib/monitoring";
import { DEFAULT_PREFS, TEXT_SIZES, THEMES, getPrefs, setPrefs, type Prefs } from "@/lib/prefs";
import { hasRecipeConsent, withdrawRecipeConsent } from "@/lib/recipes/local";
import { PROFILES } from "@rules/index";
import { LangSwitch } from "@/components/LangSwitch";
import { ProfilePicker } from "@/components/ProfilePicker";
import { LegalMenu } from "@/components/LegalMenu";
import { deleteAllData, getConsent, getProfileIds, resetTour, setConsent, setProfileIds, type ConsentRecord } from "@/lib/storage";

export default function SettingsPage() {
  const router = useRouter();
  const [consent, setConsentState] = useState<ConsentRecord | null>(null);
  const [prefs, setPrefsState] = useState<Prefs>(DEFAULT_PREFS);
  const [profiles, setProfiles] = useState<string[]>(["hashimoto"]);
  const [errorsAvailable, setErrorsAvailable] = useState(false);
  const [aiConsent, setAiConsent] = useState(false);

  useEffect(() => {
    setConsentState(getConsent());
    setPrefsState(getPrefs());
    setProfiles(getProfileIds());
    setErrorsAvailable(monitoringAvailable());
    setAiConsent(hasRecipeConsent());
  }, []);

  const change = (granted: boolean) => {
    setConsent(granted, profiles);
    setConsentState(getConsent());
  };
  const toggleProfile = (id: string) => {
    const next = profiles.includes(id) ? profiles.filter((x) => x !== id) : [...profiles, id];
    if (next.length === 0) return; // au moins un profil
    setProfiles(next);
    setProfileIds(next);
  };
  const update = (patch: Partial<Prefs>) => setPrefsState(setPrefs(patch));

  const [confirmWipe, setConfirmWipe] = useState(false);
  const wipe = async () => {
    setConfirmWipe(false);
    await deleteAllData(); // l'événement de changement ramène à l'onboarding (qui affiche la confirmation)
  };

  const status =
    consent?.status === "granted"
      ? t("settings.consent.granted", { date: new Date(consent.at).toLocaleDateString(dateLocale()) })
      : consent?.status === "refused"
        ? t("settings.consent.refused")
        : t("settings.consent.unknown");

  return (
    <div className="space-y-8">
      <h1 className="text-xl font-semibold">{t("settings.title")}</h1>

      <section aria-labelledby="s-consent" className="space-y-3">
        <h2 id="s-consent" className="text-lg font-semibold">{t("settings.consent")}</h2>
        <ProfilePicker ids={Object.keys(PROFILES)} selected={profiles} onToggle={toggleProfile} label={t("settings.profile")} />
        <p className="text-sm text-muted">{t("settings.profile.help")}</p>
        <p aria-live="polite">{status}</p>
        {consent?.status === "granted" ? (
          <button type="button" className="btn-secondary" onClick={() => change(false)}>{t("settings.consent.withdraw")}</button>
        ) : (
          <button type="button" className="btn-secondary" onClick={() => change(true)}>{t("settings.consent.enable")}</button>
        )}
        <p className="text-sm text-muted">{t("consent.body")}</p>
        <Link href="/onboarding" className="btn-secondary">{t("settings.onboarding.redo")}</Link>
        <button type="button" className="btn-secondary" onClick={() => { resetTour(); router.push("/"); }}>{t("settings.tour.redo")}</button>
      </section>

      <section aria-labelledby="s-display" className="space-y-5">
        <h2 id="s-display" className="text-lg font-semibold">{t("settings.display")}</h2>

        <div className="space-y-2">
          <p className="font-medium">{t("lang.title")}</p>
          <LangSwitch variant="list" />
        </div>

        <div className="space-y-2">
          <label htmlFor="pref-theme" className="block font-medium">{t("settings.theme")}</label>
          <select id="pref-theme" value={prefs.theme} onChange={(e) => update({ theme: e.target.value as Prefs["theme"] })} className="min-h-11 w-full rounded-xl border-2 border-line-strong bg-surface px-3 text-base">
            {THEMES.map((v) => <option key={v} value={v}>{t(`theme.${v}`)}</option>)}
          </select>
        </div>

        <div className="space-y-2">
          <label htmlFor="pref-text" className="block font-medium">{t("settings.textsize")}</label>
          <select id="pref-text" value={prefs.textSize} onChange={(e) => update({ textSize: e.target.value as Prefs["textSize"] })} className="min-h-11 w-full rounded-xl border-2 border-line-strong bg-surface px-3 text-base">
            {TEXT_SIZES.map((v) => <option key={v} value={v}>{t(`text.${v}`)}</option>)}
          </select>
          <p className="rounded-xl border border-line bg-surface p-3">{t("settings.textsize.sample")}</p>
        </div>
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

      <section aria-labelledby="s-recipes" className="space-y-3">
        <h2 id="s-recipes" className="text-lg font-semibold">{t("settings.recipes")}</h2>
        <p aria-live="polite">{aiConsent ? t("settings.recipes.on") : t("settings.recipes.off")}</p>
        {aiConsent && (
          <button type="button" className="btn-secondary" onClick={() => { withdrawRecipeConsent(); setAiConsent(false); }}>
            {t("settings.recipes.withdraw")}
          </button>
        )}
      </section>

      <section aria-labelledby="s-delete" className="space-y-3">
        <h2 id="s-delete" className="text-lg font-semibold">{t("settings.delete")}</h2>
        <p>{t("settings.delete.help")}</p>
        <button type="button" onClick={() => setConfirmWipe(true)} className="inline-flex min-h-10 w-full items-center justify-center rounded-full border-2 border-bad-ring bg-bad-bg px-5 py-1.5 text-sm font-semibold text-bad-fg">
          <Icon name="trash" className="me-2 h-5 w-5" />{t("settings.delete")}
        </button>
      </section>

      {confirmWipe && (
        <Modal titleId="wipe-title" tone="danger" onClose={() => setConfirmWipe(false)}>
          <h2 id="wipe-title" className="text-lg font-semibold">{t("settings.delete")}</h2>
          <p className="font-medium">{t("settings.delete.confirm")}</p>
          <p className="text-sm text-muted">{t("settings.delete.help")}</p>
          <div className="flex flex-col gap-3 sm:flex-row">
            <button type="button" className="btn-secondary flex-1" onClick={() => setConfirmWipe(false)}>{t("recipes.consent.cancel")}</button>
            <button type="button" onClick={wipe} className="inline-flex min-h-10 flex-1 items-center justify-center rounded-full border-2 border-bad-ring bg-bad-bg px-5 py-1.5 text-sm font-semibold text-bad-fg">
              <Icon name="trash" className="me-2 h-5 w-5" />{t("settings.delete")}
            </button>
          </div>
        </Modal>
      )}

      <section aria-labelledby="s-legal" className="space-y-3">
        <h2 id="s-legal" className="text-lg font-semibold">{t("settings.about")}</h2>
        <LegalMenu />
      </section>
    </div>
  );
}
