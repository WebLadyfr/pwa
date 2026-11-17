"use client";
import { useEffect, useId, useRef, useState } from "react";
import { t } from "@/i18n";
import { Icon } from "./Icon";

/**
 * Menu déroulant de profils, à choix MULTIPLES (cases à cocher dans un panneau).
 * Accessible : bouton avec aria-expanded, cases natives (clavier + lecteurs d'écran), Échap ferme et rend le focus,
 * clic à l'extérieur ferme. Au moins un profil reste coché (le dernier ne peut pas être décoché).
 */
export function ProfilePicker({ ids, selected, onToggle, label }: {
  ids: string[];
  selected: string[];
  onToggle: (id: string) => void;
  label: string;
}) {
  const [open, setOpen] = useState(false);
  const wrap = useRef<HTMLDivElement>(null);
  const btn = useRef<HTMLButtonElement>(null);
  const panelId = useId();

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent | TouchEvent) => { if (!wrap.current?.contains(e.target as Node)) setOpen(false); };
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") { setOpen(false); btn.current?.focus(); } };
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("touchstart", onDoc);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("touchstart", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const names = ids.filter((id) => selected.includes(id)).map((id) => t(`profile.${id}`));
  const summary = names.length <= 2 ? names.join(", ") : `${names.slice(0, 2).join(", ")} ${t("profile.picker.more", { n: names.length - 2 })}`;

  return (
    <div ref={wrap} className="relative space-y-1.5">
      <span className="block font-medium">{label}</span>
      <button
        ref={btn}
        type="button"
        aria-haspopup="true"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen((o) => !o)}
        className="flex min-h-11 w-full items-center gap-2 rounded-full border-2 border-line-strong bg-surface px-4 text-start font-semibold focus-within:border-primary-ink"
      >
        <span className="min-w-0 flex-1 truncate">{summary || t("onboarding.profile.required")}</span>
        <Icon name="chevron-down" className={`h-5 w-5 shrink-0 text-primary-ink transition-transform ${open ? "rotate-180" : ""}`} />
      </button>
      <p className="text-sm text-muted">{t("profile.picker.hint")}</p>
      {open && (
        <div
          id={panelId}
          role="group"
          aria-label={label}
          className="absolute inset-x-0 top-[3.25rem] z-30 max-h-72 space-y-0.5 overflow-y-auto rounded-3xl border-2 border-line bg-surface p-2 shadow-xl"
        >
          {ids.map((id) => {
            const checked = selected.includes(id);
            return (
              <label key={id} className={`flex min-h-12 cursor-pointer items-start gap-3 rounded-2xl p-2.5 has-[:focus-visible]:outline has-[:focus-visible]:outline-4 has-[:focus-visible]:outline-primary ${checked ? "bg-primary-soft" : ""}`}>
                <input
                  type="checkbox"
                  checked={checked}
                  disabled={checked && selected.length === 1}
                  onChange={() => onToggle(id)}
                  className="mt-1 h-5 w-5 shrink-0 accent-primary"
                />
                <span className="min-w-0">
                  <span className="block font-semibold">{t(`profile.${id}`)}</span>
                  <span className="block text-sm text-muted">{t(`profile.${id}.desc`)}</span>
                </span>
              </label>
            );
          })}
        </div>
      )}
    </div>
  );
}
