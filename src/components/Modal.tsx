"use client";
import { useEffect, useRef } from "react";

/**
 * Popup modale accessible (messages d'avertissement / de consentement) :
 * focus placé dans la popup puis restitué à la fermeture, Tab piégé, Échap = onClose, défilement de la page bloqué.
 * Un clic sur le fond ne ferme PAS : un consentement doit être un choix explicite.
 */
export function Modal({ titleId, onClose, tone = "info", children }: {
  titleId: string;
  onClose: () => void;
  tone?: "info" | "danger";
  children: React.ReactNode;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const closeRef = useRef(onClose);
  closeRef.current = onClose;

  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    ref.current?.focus({ preventScroll: true });
    return () => {
      document.body.style.overflow = prevOverflow;
      previous?.focus?.({ preventScroll: true });
    };
  }, []);

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") { e.stopPropagation(); closeRef.current(); return; }
    if (e.key !== "Tab") return;
    const f = Array.from(ref.current?.querySelectorAll<HTMLElement>("button:not(:disabled), a[href], input:not(:disabled)") ?? []);
    if (!f.length) return;
    const first = f[0]!;
    const last = f[f.length - 1]!;
    if (e.shiftKey && (document.activeElement === first || document.activeElement === ref.current)) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center p-4 sm:items-center" style={{ background: "rgba(8, 16, 15, 0.65)" }}>
      <div
        ref={ref}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        onKeyDown={onKeyDown}
        className={`max-h-[90vh] w-full max-w-md space-y-4 overflow-y-auto rounded-2xl border-2 bg-surface p-5 text-ink shadow-2xl outline-none ${tone === "danger" ? "border-bad-ring" : "border-primary"}`}
      >
        {children}
      </div>
    </div>
  );
}
