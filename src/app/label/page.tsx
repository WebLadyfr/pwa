"use client";
import { useState } from "react";
import { t } from "@/i18n";
import { prepareImage, sendLabelImage, type FetchOutcome } from "@/lib/client";
import { ResultScreen } from "@/components/ResultScreen";
import { StateMessage } from "@/components/StateMessage";

/**
 * Photo d'étiquette -> /api/label (backend) -> Claude -> produit normalisé -> même moteur de score.
 * La photo n'est jamais stockée : ni ici (mémoire seulement, ré-encodée sans EXIF), ni côté serveur.
 */
export default function LabelPage() {
  const [busy, setBusy] = useState(false);
  const [outcome, setOutcome] = useState<FetchOutcome | null>(null);

  async function onFile(file: File | undefined) {
    if (!file) return;
    setBusy(true);
    setOutcome(null);
    const blob = await prepareImage(file);
    setOutcome(blob ? await sendLabelImage(blob) : { kind: "invalid_image" });
    setBusy(false);
  }

  if (outcome?.kind === "ok") return <ResultScreen product={outcome.product} source="label" />;

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">{t("label.title")}</h1>
      <p>{t("label.intro")}</p>
      <p className="text-sm text-muted">{t("label.privacy")}</p>

      <label className={`btn-primary cursor-pointer ${busy ? "pointer-events-none opacity-60" : ""}`}>
        <span aria-hidden="true">📸&nbsp;</span>{t("label.pick")}
        <input
          type="file"
          accept="image/jpeg,image/png,image/webp"
          capture="environment"
          className="sr-only"
          disabled={busy}
          onChange={(e) => {
            void onFile(e.target.files?.[0]);
            e.target.value = ""; // ne garde aucune référence au fichier
          }}
        />
      </label>

      {busy && <p role="status">{t("label.analyzing")}</p>}
      {outcome && <StateMessage kind={outcome.kind} />}
    </div>
  );
}
