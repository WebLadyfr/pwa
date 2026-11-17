"use client";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useCallback, useState } from "react";
import { Scanner } from "@/components/Scanner";
import { ManualEntry } from "@/components/ManualEntry";
import { PhotoScan } from "@/components/PhotoScan";
import { t } from "@/i18n";

type Mode = "barcode" | "plate";

/** Écran de scan : deux modes — code-barres (caméra + saisie du code) ou assiette (photo / galerie). */
function ScanContent() {
  const router = useRouter();
  // /scan?mode=plate ouvre directement l'onglet assiette (lien du menu, ancienne page /plate).
  const initial: Mode = useSearchParams().get("mode") === "plate" ? "plate" : "barcode";
  const [mode, setMode] = useState<Mode>(initial);
  const go = useCallback((code: string) => router.push(`/product/${encodeURIComponent(code)}`), [router]);

  return (
    <div className="space-y-6 text-lg [&_.btn-primary]:!min-h-12 [&_.btn-primary]:!text-lg [&_.btn-secondary]:!min-h-12 [&_.btn-secondary]:!text-lg">
      <div role="tablist" aria-label={t("scan.mode")} className="flex gap-1 rounded-full border-2 border-line bg-surface p-1">
        {(["barcode", "plate"] as const).map((m) => (
          <button
            key={m}
            type="button"
            role="tab"
            aria-selected={mode === m}
            onClick={() => setMode(m)}
            className={`press min-h-10 flex-1 whitespace-nowrap rounded-full px-3 text-base font-semibold ${mode === m ? "bg-primary text-on-primary" : "text-primary-ink"}`}
          >
            {t(`scan.mode.${m}`)}
          </button>
        ))}
      </div>

      {mode === "barcode" ? (
        <div className="space-y-8">
          <p className="text-xl text-muted">{t("app.tagline")}</p>
          <Scanner onCode={go} />
          <ManualEntry onCode={go} />
        </div>
      ) : (
        <PhotoScan source="plate" />
      )}
    </div>
  );
}

export default function ScanPage() {
  // useSearchParams doit être sous <Suspense> pour que le build Next.js passe.
  return (
    <Suspense fallback={null}>
      <ScanContent />
    </Suspense>
  );
}
