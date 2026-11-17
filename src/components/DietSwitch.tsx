"use client";
import { useEffect, useState } from "react";
import { t } from "@/i18n";
import { Icon, type IconName } from "./Icon";
import { DIET_MODES, type DietMode } from "@/lib/diet";
import { CHANGE_EVENT, getDietMode, setDietMode } from "@/lib/storage";

const DIET_ICON: Record<DietMode, IconName> = { strict: "target", test: "flask", souple: "leaf" };

/** Choix du niveau de rigueur du régime : strict / en cours de test / souple. Persisté avec l'accord local, sinon pour la session. */
export function DietSwitch() {
  const [mode, setMode] = useState<DietMode>("strict");

  useEffect(() => {
    const sync = () => setMode(getDietMode());
    sync();
    window.addEventListener(CHANGE_EVENT, sync);
    return () => window.removeEventListener(CHANGE_EVENT, sync);
  }, []);

  return (
    <fieldset className="space-y-2" data-tour="diet">
      <legend className="mb-1 font-semibold">{t("diet.title")}</legend>
      <div className="grid grid-cols-3 gap-2">
        {DIET_MODES.map((m) => (
          <label
            key={m}
            className="press flex min-h-12 cursor-pointer flex-col items-center justify-center rounded-3xl border-2 border-line-strong bg-surface p-2 text-center text-sm font-medium has-[:checked]:border-primary-ink has-[:checked]:bg-primary has-[:checked]:text-on-primary"
          >
            <input
              type="radio"
              name="diet-mode"
              value={m}
              checked={mode === m}
              onChange={() => setDietMode(m)}
              className="sr-only"
            />
            <Icon name={DIET_ICON[m]} className="mb-0.5 h-5 w-5" />
            {t(`diet.${m}`)}
          </label>
        ))}
      </div>
      <p className="text-sm text-muted" aria-live="polite">{t(`diet.${mode}.help`)}</p>
    </fieldset>
  );
}
