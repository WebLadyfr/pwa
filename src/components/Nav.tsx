"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { t } from "@/i18n";
import { Icon, type IconName } from "./Icon";

/** Menu « pilule » fixé en bas de l'écran : accès au pouce aux écrans les plus utilisés + un sous-menu (trois traits). */
const ITEMS: { href: string; key: string; icon: IconName; tour: string }[] = [
  { href: "/", key: "nav.home", icon: "home", tour: "home" },
  { href: "/scan", key: "nav.scan", icon: "scan", tour: "scan" },
  { href: "/favorites", key: "nav.favorites", icon: "heart", tour: "favorites" },
];

/** Contenu du sous-menu. */
const MORE: { href: string; key: string; icon: IconName }[] = [
  { href: "/recipes", key: "nav.recipes", icon: "utensils" },
  { href: "/fridge", key: "nav.fridge", icon: "fridge" },
  { href: "/label", key: "nav.label", icon: "tag" },
  { href: "/symptoms", key: "nav.symptoms", icon: "clipboard" },
  { href: "/history", key: "nav.history", icon: "clock" },
  { href: "/progress", key: "nav.progress", icon: "chart" },
  { href: "/settings", key: "nav.settings", icon: "settings" },
];

export function Nav() {
  const path = usePathname();
  const [open, setOpen] = useState(false);
  const wrap = useRef<HTMLLIElement>(null);

  useEffect(() => setOpen(false), [path]); // fermé à chaque changement d'écran
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

  const inMore = MORE.some((m) => path.startsWith(m.href));
  return (
    <nav
      aria-label={t("nav.main")}
      className="fixed inset-x-0 bottom-0 z-40 flex justify-center px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]"
    >
      <ul className="flex w-full max-w-sm gap-1 rounded-full border-2 border-line bg-surface p-1.5 shadow-lg">
        {ITEMS.map((i) => {
          const current = i.href === "/" ? path === "/" : path.startsWith(i.href);
          return (
            <li key={i.href} className="min-w-0 flex-1">
              <Link
                href={i.href}
                data-tour={`nav-${i.tour}`}
                aria-current={current ? "page" : undefined}
                className={`press flex min-h-11 flex-col items-center justify-center rounded-full px-1 text-center text-sm font-semibold leading-tight ${current ? "bg-primary text-on-primary" : "text-primary"}`}
              >
                <Icon name={i.icon} className="h-5 w-5" filled={i.icon === "heart" && current} />
                {t(i.key)}
              </Link>
            </li>
          );
        })}
        <li ref={wrap} className="relative min-w-0 flex-1">
          <button
            type="button"
            data-tour="nav-menu"
            aria-haspopup="true"
            aria-expanded={open}
            aria-controls="more-menu"
            onClick={() => setOpen((o) => !o)}
            className={`press flex min-h-11 w-full flex-col items-center justify-center rounded-full px-1 text-center text-sm font-semibold leading-tight ${open || inMore ? "bg-primary text-on-primary" : "text-primary"}`}
          >
            <Icon name={open ? "x" : "menu"} className="h-5 w-5" />
            {t("nav.menu")}
          </button>
          {open && (
            <ul id="more-menu" className="absolute bottom-full end-0 mb-3 w-64 space-y-0.5 rounded-3xl border-2 border-line bg-surface p-2 shadow-xl">
              {MORE.map((m) => (
                <li key={m.href}>
                  <Link
                    href={m.href}
                    aria-current={path.startsWith(m.href) ? "page" : undefined}
                    className={`press flex min-h-11 items-center gap-3 rounded-full px-4 text-base font-semibold ${path.startsWith(m.href) ? "bg-primary text-on-primary" : "text-primary"}`}
                  >
                    <Icon name={m.icon} className="h-5 w-5" />
                    {t(m.key)}
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </li>
      </ul>
    </nav>
  );
}
