"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { t } from "@/i18n";

const ITEMS = [
  { href: "/", key: "nav.scan", icon: "📷" },
  { href: "/search", key: "nav.search", icon: "🔎" },
  { href: "/label", key: "nav.label", icon: "🏷️" },
  { href: "/favorites", key: "nav.favorites", icon: "♥" },
  { href: "/history", key: "nav.history", icon: "🕘" },
  { href: "/settings", key: "nav.settings", icon: "⚙️" },
];

export function Nav() {
  const path = usePathname();
  return (
    <nav aria-label={t("nav.main")}>
      {/* 3 colonnes x 2 lignes : reste lisible même avec le texte « très grand ». */}
      <ul className="grid grid-cols-3 gap-2">
        {ITEMS.map((i) => {
          const current = i.href === "/" ? path === "/" : path.startsWith(i.href);
          return (
            <li key={i.href}>
              <Link
                href={i.href}
                aria-current={current ? "page" : undefined}
                className={`flex min-h-14 flex-col items-center justify-center rounded-xl border-2 px-1 py-1 text-center text-sm font-medium ${current ? "border-primary bg-primary text-on-primary" : "border-line bg-surface text-primary"}`}
              >
                <span aria-hidden="true">{i.icon}</span>
                {t(i.key)}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
