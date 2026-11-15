"use client";
import { useEffect, useRef, useState } from "react";
import { LOCALE_NAMES, getLocale, locales, setLocale, t, type Locale } from "@/i18n";
import { Icon } from "./Icon";

/**
 * Choix de la langue. `variant="button"` : icône de traduction dans l'en-tête (ouvre une petite liste) ;
 * `variant="list"` : liste de boutons radio (écran Réglages).
 */
export function LangSwitch({ variant = "button" }: { variant?: "button" | "list" }) {
  const [mounted, setMounted] = useState(false);
  const [open, setOpen] = useState(false);
  const wrap = useRef<HTMLDivElement>(null);
  useEffect(() => setMounted(true), []);
  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent | TouchEvent) => { if (!wrap.current?.contains(e.target as Node)) setOpen(false); };
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("touchstart", onDoc);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("touchstart", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  if (!mounted) return variant === "button" ? <span className="inline-block h-11 w-11" aria-hidden="true" /> : null;
  const cur = getLocale();
  const choose = (l: Locale) => { if (l !== cur) setLocale(l); setOpen(false); };

  if (variant === "list") {
    return (
      <div role="radiogroup" aria-label={t("lang.title")} className="grid grid-cols-3 gap-2">
        {locales.map((l) => (
          <label key={l} className="flex min-h-10 cursor-pointer items-center justify-center gap-2 rounded-full border-2 border-line-strong bg-surface p-2 text-center has-[:checked]:border-primary">
            <input type="radio" name="lang" value={l} checked={cur === l} onChange={() => choose(l)} className="h-4 w-4 shrink-0 accent-primary" />
            <span lang={l}>{LOCALE_NAMES[l]}</span>
          </label>
        ))}
      </div>
    );
  }

  return (
    <div ref={wrap} className="relative">
      <button
        type="button"
        data-tour="lang"
        aria-label={t("lang.title")}
        aria-haspopup="true"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
        className="press inline-flex min-h-10 items-center justify-center gap-1.5 rounded-full border-2 border-line bg-surface px-3 text-sm font-semibold text-primary"
      >
        <Icon name="languages" className="h-5 w-5" />
        <span aria-hidden="true">{cur.toUpperCase()}</span>
      </button>
      {open && (
        <ul className="absolute end-0 top-full z-50 mt-2 w-40 space-y-1 rounded-2xl border-2 border-line bg-surface p-1.5 shadow-lg">
          {locales.map((l) => (
            <li key={l}>
              <button
                type="button"
                lang={l}
                aria-current={cur === l ? "true" : undefined}
                onClick={() => choose(l)}
                className={`press flex min-h-10 w-full items-center justify-between gap-2 rounded-full px-3 text-start ${cur === l ? "bg-primary text-on-primary" : "text-primary"}`}
              >
                {LOCALE_NAMES[l]}
                {cur === l && <Icon name="check" className="h-4 w-4" />}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
