"use client";
import { useEffect } from "react";

/**
 * Retour tactile léger sur les boutons (vibration courte, si l'appareil la permet). L'effet visuel d'appui
 * est en CSS (classe .press / boutons). Respecte « réduire les animations ».
 */
export function PressFeedback() {
  useEffect(() => {
    const onDown = (e: PointerEvent) => {
      if (e.pointerType !== "touch") return;
      if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return;
      const el = (e.target as HTMLElement | null)?.closest("button, a, label, summary");
      if (el && !el.hasAttribute("disabled")) navigator.vibrate?.(8);
    };
    document.addEventListener("pointerdown", onDown, { passive: true });
    return () => document.removeEventListener("pointerdown", onDown);
  }, []);
  return null;
}
