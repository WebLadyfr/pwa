"use client";
import { useEffect, useRef, useState } from "react";
import { t } from "@/i18n";
import { isValidGtin } from "@/lib/barcode";

type CamError = "denied" | "notfound" | "error" | null;
const READER_ID = "barcode-reader";

/**
 * Scan caméra via html5-qrcode (chargé à la demande : n'alourdit pas le premier chargement).
 * La caméra ne démarre qu'après un clic (permission demandée au bon moment, jamais à l'ouverture).
 * Aucune image du flux vidéo n'est envoyée ni conservée : décodage 100 % local.
 */
export function Scanner({ onCode }: { onCode: (code: string) => void }) {
  const [active, setActive] = useState(false);
  const [error, setError] = useState<CamError>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const scannerRef = useRef<any>(null);
  const doneRef = useRef(false);

  useEffect(() => {
    if (!active) return;
    let cancelled = false;
    doneRef.current = false;

    (async () => {
      try {
        const { Html5Qrcode, Html5QrcodeSupportedFormats: F } = await import("html5-qrcode");
        if (cancelled) return;
        const scanner = new Html5Qrcode(READER_ID, {
          verbose: false,
          formatsToSupport: [F.EAN_13, F.EAN_8, F.UPC_A, F.UPC_E],
          useBarCodeDetectorIfSupported: true,
        });
        scannerRef.current = scanner;
        await scanner.start(
          { facingMode: "environment" },
          { fps: 10, qrbox: { width: 260, height: 140 } },
          (text: string) => {
            if (doneRef.current || !isValidGtin(text)) return; // ignore les lectures erronées
            doneRef.current = true;
            navigator.vibrate?.(60);
            onCode(text);
          },
          () => {},
        );
      } catch (e) {
        if (cancelled) return;
        const msg = String((e as { name?: string; message?: string })?.name ?? e) + String((e as { message?: string })?.message ?? "");
        setError(/NotAllowed|Permission|denied/i.test(msg) ? "denied" : /NotFound|no camera|Requested device/i.test(msg) ? "notfound" : "error");
        setActive(false);
      }
    })();

    return () => {
      cancelled = true;
      const s = scannerRef.current;
      scannerRef.current = null;
      // Libère la caméra (voyant éteint) à la fermeture / navigation.
      if (s) s.stop().then(() => s.clear()).catch(() => {});
    };
  }, [active, onCode]);

  return (
    <section aria-labelledby="scan-title" className="space-y-3">
      <h1 id="scan-title" className="text-xl font-semibold">{t("scan.title")}</h1>
      {active ? (
        <>
          <div id={READER_ID} className="w-full overflow-hidden rounded-2xl bg-black" />
          <p className="text-muted">{t("scan.hint")}</p>
          <button type="button" className="btn-secondary" onClick={() => setActive(false)}>{t("scan.stop")}</button>
        </>
      ) : (
        <button type="button" className="btn-primary" onClick={() => { setError(null); setActive(true); }}>
          <span aria-hidden="true">📷 </span>{t("scan.start")}
        </button>
      )}
      {error && <p role="alert" className="rounded-xl bg-warn-bg p-3 text-warn-fg">{t(`scan.camera.${error}`)}</p>}
    </section>
  );
}
