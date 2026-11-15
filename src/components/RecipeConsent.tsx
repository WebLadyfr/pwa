"use client";
import { useState } from "react";
import { t } from "@/i18n";
import { Modal } from "./Modal";

/**
 * Popup de transparence AVANT le premier envoi : la liste d'ingrédients part chez un prestataire d'IA hors UE.
 * Rien n'est envoyé tant que la case n'est pas cochée ET « Continuer » pressé. « Annuler » ferme sans rien envoyer.
 */
export function RecipeConsent({ onAccept, onCancel }: { onAccept: () => void; onCancel: () => void }) {
  const [checked, setChecked] = useState(false);

  return (
    <Modal titleId="rc-consent-title" onClose={onCancel}>
      <h2 id="rc-consent-title" className="text-lg font-semibold">{t("recipes.consent.title")}</h2>
      <p className="font-medium">{t("recipes.consent.body")}</p>
      <p className="text-sm text-muted">{t("recipes.consent.detail")}</p>
      <label className="flex min-h-12 cursor-pointer items-start gap-3">
        <input type="checkbox" checked={checked} onChange={(e) => setChecked(e.target.checked)} className="mt-1 h-6 w-6 shrink-0 accent-primary" />
        <span>{t("recipes.consent.check")}</span>
      </label>
      <div className="flex flex-col gap-3 sm:flex-row">
        <button type="button" className="btn-secondary flex-1" onClick={onCancel}>{t("recipes.consent.cancel")}</button>
        <button type="button" className="btn-primary flex-1 disabled:cursor-not-allowed disabled:opacity-50" disabled={!checked} onClick={onAccept}>
          {t("recipes.consent.continue")}
        </button>
      </div>
      <a href="/privacy" target="_blank" rel="noopener noreferrer" className="inline-block underline">{t("recipes.consent.privacy")}</a>
    </Modal>
  );
}
