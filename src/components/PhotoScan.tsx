"use client";
import { Icon } from "@/components/Icon";
import { useRef, useState } from "react";
import { t } from "@/i18n";
import { prepareImage, sendLabelImage, sendPlateImage, type FetchOutcome } from "@/lib/client";
import { ResultScreen } from "@/components/ResultScreen";
import { StateMessage } from "@/components/StateMessage";

/**
 * Photo (étiquette ou assiette) -> backend -> Claude -> produit normalisé -> même moteur de score.
 * La photo n'est jamais stockée : ni ici (mémoire seulement, ré-encodée sans EXIF), ni côté serveur.
 *
 * Deux vrais boutons (appareil photo / galerie) qui déclenchent un champ fichier masqué : plus fiable sur mobile et en PWA
 * que l'ancien « label + champ invisible », et la galerie reste accessible si l'appareil photo est refusé.
 */
export function PhotoScan({ source }: { source: "label" | "plate" }) {
  const [busy, setBusy] = useState(false);
  const [outcome, setOutcome] = useState<FetchOutcome | null>(null);
  const cameraRef = useRef<HTMLInputElement>(null);
  const galleryRef = useRef<HTMLInputElement>(null);

  async function onFile(file: File | undefined) {
    if (!file) return;
    setBusy(true);
    setOutcome(null);
    const blob = await prepareImage(file);
    setOutcome(blob ? await (source === "plate" ? sendPlateImage(blob) : sendLabelImage(blob)) : { kind: "invalid_image" });
    setBusy(false);
  }

  if (outcome?.kind === "ok") return <ResultScreen product={outcome.product} source={source} />;

  const onChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = ""; // ne garde aucune référence au fichier (le File déjà lu reste valide)
    void onFile(file);
  };

  return (
    <div className="space-y-4 text-lg [&_.btn-primary]:!min-h-12 [&_.btn-primary]:!text-lg [&_.btn-secondary]:!min-h-12 [&_.btn-secondary]:!text-lg">
      <h1 className="text-2xl font-semibold">{t(`${source}.title`)}</h1>
      <p>{t(`${source}.intro`)}</p>
      <p className="text-base text-muted">{t(`${source}.privacy`)}</p>

      <input ref={cameraRef} type="file" accept="image/*" capture="environment" hidden onChange={onChange} aria-hidden="true" tabIndex={-1} />
      <input ref={galleryRef} type="file" accept="image/jpeg,image/png,image/webp" hidden onChange={onChange} aria-hidden="true" tabIndex={-1} />

      <button type="button" className="btn-primary" disabled={busy} onClick={() => cameraRef.current?.click()}>
        <Icon name="camera" className="me-2 h-5 w-5" />{t("label.pick")}
      </button>
      <button type="button" className="btn-secondary btn-alt" disabled={busy} onClick={() => galleryRef.current?.click()}>
        <Icon name="image" className="me-2 h-5 w-5" />{t("label.gallery")}
      </button>

      {busy && <p role="status" className="rounded-xl bg-surface p-4 text-xl">{t(`${source}.analyzing`)}</p>}
      {outcome && <StateMessage kind={outcome.kind as Exclude<FetchOutcome["kind"], "ok">} plate={source === "plate"} />}
    </div>
  );
}
