"use client";
import { Icon } from "@/components/Icon";
import { useEffect, useRef, useState } from "react";
import { PROFILES } from "@rules/index";
import { t } from "@/i18n";
import { ProfilePicker } from "./ProfilePicker";
import { LegalConsentLine } from "./LegalConsentLine";
import { Modal } from "./Modal";
import { acceptDisclaimer, consumeDeletedNotice, getProfileIds, setConsent } from "@/lib/storage";

const TOTAL = 2;

/**
 * Onboarding en 2 écrans : (1) bienvenue + choix des profils (menu déroulant, choix multiple), (2) disclaimer + consentement.
 *  - Le disclaimer doit être coché AVANT d'accéder à l'app.
 *  - Consentement (art. 9 RGPD) : « J'accepte » et « Je refuse » ont le même poids visuel.
 *  - Refus : profil gardé en MÉMOIRE (session) seulement ; rien n'est écrit sur l'appareil
 *    hormis la trace du refus lui-même (pour ne pas redemander à chaque lancement).
 */
export function Onboarding({ onDone }: { onDone: () => void }) {
  const [step, setStep] = useState(1);
  const profileIds = Object.keys(PROFILES);
  const [profiles, setProfiles] = useState<string[]>(() => {
    const ids = getProfileIds().filter((id) => profileIds.includes(id));
    return ids.length > 0 ? ids : [profileIds[0] ?? "hashimoto"];
  });
  const toggleProfile = (id: string) =>
    setProfiles((cur) => (cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id]));
  const [ack, setAck] = useState(false);
  const [deleted, setDeleted] = useState(false);
  const titleRef = useRef<HTMLHeadingElement>(null);

  useEffect(() => setDeleted(consumeDeletedNotice()), []);
  // Place le focus sur le titre à chaque écran (lecteurs d'écran / clavier).
  useEffect(() => { if (step < 2) titleRef.current?.focus(); }, [step]); // à l'étape 2 la popup gère son propre focus

  const finish = (granted: boolean) => {
    if (!ack) return;
    acceptDisclaimer();
    setConsent(granted, profiles);
    onDone();
  };

  return (
    <section aria-labelledby="ob-title" className="space-y-5">
      <p className="text-sm text-muted" aria-live="polite">{t("onboarding.step", { n: step, total: TOTAL })}</p>

      {step >= 1 && (
        <>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo-horizontal.svg" alt={t("app.name")} width={1504} height={512} className="mx-auto h-auto w-full max-w-xs" />
          {deleted && <p role="status" className="rounded-xl bg-primary-soft p-3">{t("onboarding.deleted")}</p>}
          <h1 id="ob-title" ref={titleRef} tabIndex={-1} className="text-2xl font-bold">{t("onboarding.welcome.title")}</h1>
          <p className="text-lg">{t("onboarding.welcome.body")}</p>
          <ul className="space-y-2">
            {["p1", "p2", "p3"].map((k) => (
              <li key={k} className="flex gap-3"><Icon name="check" className="mt-0.5 h-5 w-5" />{t(`onboarding.welcome.${k}`)}</li>
            ))}
          </ul>
          <p role="note" className="rounded-2xl bg-primary-soft p-3 font-medium">
            <Icon name="heart" className="me-1.5 h-5 w-5 align-[-0.2em]" />{t("onboarding.profile.positive")}
          </p>
          <ProfilePicker ids={profileIds} selected={profiles} onToggle={toggleProfile} label={t("onboarding.profile.title")} />
          <p className="text-sm text-muted">{t("onboarding.profile.more")}</p>
          <button type="button" className="btn-primary text-lg font-bold" disabled={profiles.length === 0} onClick={() => setStep(2)}>{t("onboarding.welcome.start")}</button>
        </>
      )}

      {step === 2 && (
        <Modal titleId="ob-final-title" onClose={() => setStep(1)}>
          <h2 id="ob-final-title" className="text-xl font-bold">{t("onboarding.final.title")}</h2>

          <div role="note" className="rounded-2xl border-2 border-warn-ring bg-warn-bg p-4 font-medium text-warn-fg">
            <Icon name="alert" className="me-1 h-4 w-4 align-[-0.15em]" />{t("disclaimer")}
          </div>
          <label className="flex min-h-12 cursor-pointer items-start gap-3">
            <input type="checkbox" checked={ack} onChange={(e) => setAck(e.target.checked)} className="mt-1 h-6 w-6 accent-primary" aria-describedby={ack ? undefined : "ack-help"} />
            <span>{t("onboarding.ack")}</span>
          </label>
          {!ack && <p id="ack-help" className="text-sm text-muted">{t("onboarding.ack.required")}</p>}

          <div className="space-y-3 rounded-2xl border-2 border-primary-ink bg-surface p-4">
            <h3 className="text-lg font-semibold">{t("onboarding.consent.title")}</h3>
            <p>{t("consent.body")}</p>
            <LegalConsentLine />
            <p className="text-sm text-muted">{t("onboarding.refuse.note")}</p>
            <div className="flex flex-col gap-3 sm:flex-row">
              <button type="button" className="btn-secondary flex-1" disabled={!ack} onClick={() => finish(true)}>{t("consent.accept")}</button>
              <button type="button" className="btn-secondary flex-1" disabled={!ack} onClick={() => finish(false)}>{t("consent.refuse")}</button>
            </div>
          </div>

          <button type="button" className="btn-secondary" onClick={() => setStep(1)}>{t("onboarding.back")}</button>
        </Modal>
      )}
    </section>
  );
}
