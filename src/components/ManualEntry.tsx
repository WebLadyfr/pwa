"use client";
import { useState } from "react";
import { t } from "@/i18n";
import { cleanBarcodeInput, isValidGtin } from "@/lib/barcode";

/** Saisie manuelle : fallback si la caméra est refusée / indisponible. */
export function ManualEntry({ onCode }: { onCode: (code: string) => void }) {
  const [value, setValue] = useState("");
  const [invalid, setInvalid] = useState(false);

  return (
    <form
      className="space-y-3"
      noValidate
      onSubmit={(e) => {
        e.preventDefault();
        const code = cleanBarcodeInput(value);
        if (isValidGtin(code)) onCode(code);
        else setInvalid(true);
      }}
    >
      <h2 className="text-lg font-semibold">{t("scan.manual.title")}</h2>
      <label htmlFor="manual-code" className="block">{t("scan.manual.label")}</label>
      <input
        id="manual-code"
        inputMode="numeric"
        autoComplete="off"
        maxLength={20}
        value={value}
        onChange={(e) => { setValue(e.target.value); setInvalid(false); }}
        aria-invalid={invalid}
        aria-describedby={invalid ? "manual-err" : undefined}
        className="w-full rounded-xl border-2 border-line-strong bg-surface p-3 text-lg tracking-wider"
      />
      {invalid && <p id="manual-err" role="alert" className="text-bad-fg">{t("scan.manual.invalid")}</p>}
      <button type="submit" className="btn-secondary">{t("scan.manual.submit")}</button>
    </form>
  );
}
