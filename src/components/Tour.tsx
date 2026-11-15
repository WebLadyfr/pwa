"use client";
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { t } from "@/i18n";
import { CHANGE_EVENT, markTourSeen, tourSeen } from "@/lib/storage";

/** `target` = valeur de l'attribut data-tour de l'élément visé. Sans cible (ou cible absente) : popup centrée, sans flèche. */
interface Step { id: string; target?: string }

const STEPS: Step[] = [
  { id: "welcome" },
  { id: "search", target: "search-bar" },
  { id: "scan", target: "nav-scan" },
  { id: "label", target: "tile-label" },
  { id: "diet", target: "diet" },
  { id: "progress", target: "progress" },
  { id: "favorites", target: "nav-favorites" },
  { id: "menu", target: "nav-menu" },
  { id: "lang", target: "lang" },
];

const GAP = 14; // espace entre la cible et la popup (la flèche y loge)
const MARGIN = 16; // marge minimale avec le bord de l'écran
const PAD = 6; // débord du projecteur autour de la cible

interface Layout {
  spot: { top: number; left: number; width: number; height: number } | null;
  card: { top: number; left: number };
  side: "below" | "above" | "center";
  arrowX: number; // position de la flèche dans la popup (px depuis son bord gauche)
}

/**
 * Visite guidée : popup + flèche qui pointe l'élément expliqué, le reste de l'écran est assombri.
 * Affichée une seule fois après l'onboarding (sur l'accueil), rejouable depuis les Réglages.
 * Accessible : role="dialog", focus dans la popup, Échap = passer, aucune information portée par la flèche seule.
 */
export function Tour() {
  const [active, setActive] = useState(false);
  const [i, setI] = useState(0);
  const [layout, setLayout] = useState<Layout | null>(null);
  const cardRef = useRef<HTMLDivElement>(null);
  const step = STEPS[i]!;

  useEffect(() => {
    const check = () => setActive(!tourSeen());
    check();
    window.addEventListener(CHANGE_EVENT, check);
    return () => window.removeEventListener(CHANGE_EVENT, check);
  }, []);

  // Réinitialise l'étape quand la visite est (re)lancée.
  useEffect(() => { if (active) setI(0); }, [active]);

  const finish = useCallback(() => {
    markTourSeen();
    setActive(false);
  }, []);

  const compute = useCallback(() => {
    const card = cardRef.current;
    if (!card) return;
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const cw = card.offsetWidth;
    const ch = card.offsetHeight;
    const el = step.target ? document.querySelector<HTMLElement>(`[data-tour="${step.target}"]`) : null;
    if (!el) {
      setLayout({ spot: null, side: "center", arrowX: 0, card: { top: Math.max(MARGIN, (vh - ch) / 2), left: Math.max(MARGIN, (vw - cw) / 2) } });
      return;
    }
    const r = el.getBoundingClientRect();
    const spot = { top: r.top - PAD, left: r.left - PAD, width: r.width + PAD * 2, height: r.height + PAD * 2 };
    const below = vh - (spot.top + spot.height) - GAP >= ch + MARGIN;
    const side = below ? "below" : "above";
    const top = below ? spot.top + spot.height + GAP : Math.max(MARGIN, spot.top - GAP - ch);
    const cx = r.left + r.width / 2;
    const left = Math.min(Math.max(MARGIN, cx - cw / 2), Math.max(MARGIN, vw - cw - MARGIN));
    setLayout({ spot, side, card: { top, left }, arrowX: Math.min(Math.max(24, cx - left), cw - 24) });
  }, [step]);

  // À chaque étape : amener la cible à l'écran, puis positionner la popup.
  useLayoutEffect(() => {
    if (!active) return;
    const el = step.target ? document.querySelector<HTMLElement>(`[data-tour="${step.target}"]`) : null;
    el?.scrollIntoView({ block: "center", behavior: "instant" as ScrollBehavior });
    compute();
    cardRef.current?.focus({ preventScroll: true });
  }, [active, step, compute]);

  useEffect(() => {
    if (!active) return;
    const on = () => compute();
    window.addEventListener("resize", on);
    window.addEventListener("scroll", on, true);
    return () => {
      window.removeEventListener("resize", on);
      window.removeEventListener("scroll", on, true);
    };
  }, [active, compute]);

  if (!active) return null;

  const last = i === STEPS.length - 1;
  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") finish();
    if (e.key === "Tab") {
      // Garde le focus dans la popup.
      const f = cardRef.current?.querySelectorAll<HTMLElement>("button");
      if (!f?.length) return;
      const first = f[0]!;
      const lastEl = f[f.length - 1]!;
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); lastEl.focus(); }
      else if (!e.shiftKey && document.activeElement === lastEl) { e.preventDefault(); first.focus(); }
    }
  };

  return (
    <div className="fixed inset-0 z-50" data-testid="tour">
      {/* Calque qui bloque les clics sur l'app pendant la visite. */}
      <div className="absolute inset-0" aria-hidden="true" onClick={(e) => e.stopPropagation()} style={layout?.spot ? undefined : { background: "rgba(8, 16, 15, 0.65)" }} />

      {/* Projecteur : l'ombre immense assombrit tout sauf la cible. */}
      {layout?.spot && (
        <div
          aria-hidden="true"
          className="pointer-events-none absolute rounded-2xl border-[3px] border-primary transition-all duration-200"
          style={{ ...layout.spot, boxShadow: "0 0 0 9999px rgba(8, 16, 15, 0.65)" }}
        />
      )}

      <div
        ref={cardRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="tour-title"
        aria-describedby="tour-body"
        aria-label={t("tour.dialog")}
        tabIndex={-1}
        onKeyDown={onKeyDown}
        className="absolute w-[min(22rem,calc(100vw-2rem))] rounded-2xl border-2 border-primary bg-surface p-4 text-ink shadow-2xl outline-none transition-[top,left] duration-200"
        style={{ top: layout?.card.top ?? 0, left: layout?.card.left ?? 0, visibility: layout ? "visible" : "hidden" }}
      >
        {/* Flèche : carré pivoté qui dépasse du bord de la popup, orienté vers la cible. */}
        {layout && layout.side !== "center" && (
          <span
            aria-hidden="true"
            className="absolute h-4 w-4 rotate-45 border-primary bg-surface"
            style={
              layout.side === "below"
                ? { top: -9, left: layout.arrowX - 8, borderTopWidth: 2, borderLeftWidth: 2 }
                : { bottom: -9, left: layout.arrowX - 8, borderBottomWidth: 2, borderRightWidth: 2 }
            }
          />
        )}

        <p className="text-sm text-muted" aria-live="polite">{t("tour.step", { n: i + 1, total: STEPS.length })}</p>
        <h2 id="tour-title" className="mt-1 text-lg font-bold">{t(`tour.${step.id}.title`)}</h2>
        <p id="tour-body" className="mt-1">{t(`tour.${step.id}.body`)}</p>

        <div className="mt-3 flex items-center gap-1" aria-hidden="true">
          {STEPS.map((s, k) => (
            <span key={s.id} className={`h-1.5 flex-1 rounded-full ${k <= i ? "bg-primary" : "bg-line"}`} />
          ))}
        </div>

        <div className="mt-4 flex items-center gap-2">
          {!last && (
            <button type="button" onClick={finish} className="min-h-10 shrink-0 rounded-full px-4 font-medium text-primary underline">
              {t("tour.skip")}
            </button>
          )}
          <div className="ml-auto flex gap-2">
            {i > 0 && (
              <button type="button" onClick={() => setI(i - 1)} className="btn-secondary !w-auto">{t("tour.prev")}</button>
            )}
            <button type="button" onClick={() => (last ? finish() : setI(i + 1))} className="btn-primary !w-auto">
              {last ? t("tour.done") : t("tour.next")}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
