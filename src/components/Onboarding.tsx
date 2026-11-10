"use client";
import { useEffect, useRef, useState } from "react";
import { PROFILES } from "@rules/index";
import { t } from "@/i18n";
import { acceptDisclaimer, consumeDeletedNotice, getProfileId, setConsent } from "@/lib/storage";

const TOTAL = 3;

/**
 * Onboarding en 3 écrans : (1) bienvenue, (2) profil, (3) disclaimer + consentement.
 *  - Le disclaimer doit être coché AVANT d'accéder à l'app.
 *  - Consentement (art. 9 RGPD) : « J'accepte » et « Je refuse » ont le même poids visuel.
 *  - Refus : profil gardé en MÉMOIRE (session) seulement ; rien n'est écrit sur l'appareil
 *    hormis la trace du refus lui-même (pour ne pas redemander à chaque lancement).
 */
export function Onboarding({ onDone }: { onDone: () => void }) {
  const [step, setStep] = useState(1);
  const profileIds = Object.keys(PROFILES);
  const [profile, setProfile] = useState(() => {
    const id = getProfileId();
    return profileIds.includes(id) ? id : (profileIds[0] ?? "hashimoto");
  });
  const [ack, setAck] = useState(false);
  const [deleted, setDeleted] = useState(false);
  const titleRef = useRef<HTMLHeadingElement>(null);

  useEffect(() => setDeleted(consumeDeletedNotice()), []);
  // Place le focus sur le titre à chaque écran (lecteurs d'écran / clavier).
  useEffect(() => titleRef.current?.focus(), [step]);

  const finish = (granted: boolean) => {
    if (!ack) return;
    acceptDisclaimer();
    setConsent(granted, profile);
    onDone();
  };

  return (
    <section aria-labelledby="ob-title" className="space-y-5">
      <p className="text-sm text-muted" aria-live="polite">{t("onboarding.step", { n: step, total: TOTAL })}</p>

      {step === 1 && (
        <>
          {deleted && <p role="status" className="rounded-xl bg-primary-soft p-3">{t("onboarding.deleted")}</p>}
          <h1 id="ob-title" ref={titleRef} tabIndex={-1} className="text-2xl font-bold">{t("onboarding.welcome.title")}</h1>
          <p className="text-lg">{t("onboarding.welcome.body")}</p>
          <ul className="space-y-2">
            {["p1", "p2", "p3"].map((k) => (
              <li key={k} className="flex gap-3"><span aria-hidden="true">✔</span>{t(`onboarding.welcome.${k}`)}</li>
            ))}
          </ul>
          <button type="button" className="btn-primary" onClick={() => setStep(2)}>{t("onboarding.welcome.start")}</button>
        </>
      )}

      {step === 2 && (
        <>
          <h1 id="ob-title" ref={titleRef} tabIndex={-1} className="text-2xl font-bold">{t("onboarding.profile.title")}</h1>
          <p>{t("onboarding.profile.body")}</p>
          <fieldset className="space-y-2">
            <legend className="sr-only">{t("onboarding.profile.title")}</legend>
            {profileIds.map((id) => (
              <label key={id} className="flex min-h-14 cursor-pointer items-start gap-3 rounded-xl border-2 border-line-strong bg-surface p-3 has-[:checked]:border-primary">
                <input type="radio" name="profile" value={id} checked={profile === id} onChange={() => setProfile(id)} className="mt-1 h-5 w-5 accent-primary" />
                <span>
                  <span className="block font-semibold">{t(`profile.${id}`)}</span>
                  <span className="block text-sm text-muted">{t(`profile.${id}.desc`)}</span>
                </span>
              </label>
            ))}
          </fieldset>
          <p className="text-sm text-muted">{t("onboarding.profile.more")}</p>
          <div className="flex flex-col gap-3 sm:flex-row">
            <button type="button" className="btn-secondary" onClick={() => setStep(1)}>{t("onboarding.back")}</button>
            <button type="button" className="btn-primary" onClick={() => setStep(3)}>{t("onboarding.next")}</button>
          </div>
        </>
      )}

      {step === 3 && (
        <>
          <h1 id="ob-title" ref={titleRef} tabIndex={-1} className="text-2xl font-bold">{t("onboarding.final.title")}</h1>

          <div role="note" className="rounded-2xl border-2 border-warn-ring bg-warn-bg p-4 font-medium text-warn-fg">
            <span aria-hidden="true">▲ </span>{t("disclaimer")}
          </div>
          <label className="flex min-h-12 cursor-pointer items-start gap-3">
            <input type="checkbox" checked={ack} onChange={(e) => setAck(e.target.checked)} className="mt-1 h-6 w-6 accent-primary" aria-describedby={ack ? undefined : "ack-help"} />
            <span>{t("onboarding.ack")}</span>
          </label>
          {!ack && <p id="ack-help" className="text-sm text-muted">{t("onboarding.ack.required")}</p>}

          <div className="space-y-3 rounded-2xl border-2 border-primary bg-surface p-4">
            <h2 className="text-lg font-semibold">{t("onboarding.consent.title")}</h2>
            <p>{t("consent.body")}</p>
            <p className="text-sm text-muted">{t("onboarding.refuse.note")}</p>
            <div className="flex flex-col gap-3 sm:flex-row">
              <button type="button" className="btn-secondary flex-1" disabled={!ack} onClick={() => finish(true)}>{t("consent.accept")}</button>
              <button type="button" className="btn-secondary flex-1" disabled={!ack} onClick={() => finish(false)}>{t("consent.refuse")}</button>
            </div>
            <a href="/privacy" target="_blank" rel="noopener noreferrer" className="inline-block underline">{t("onboarding.privacy.link")}</a>
          </div>

          <button type="button" className="btn-secondary" onClick={() => setStep(2)}>{t("onboarding.back")}</button>
        </>
      )}
    </section>
  );
}
