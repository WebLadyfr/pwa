"use client";
import { useEffect, useState } from "react";
import { t } from "@/i18n";

/** Mentions obligatoires visibles sur toutes les pages, en pied de page (au-dessus du menu du bas). */
export function Footer() {
  // Rendu après montage : la langue choisie n'est connue que dans le navigateur.
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  if (!mounted) return <footer className="mt-8 min-h-24" aria-hidden="true" />;
  return (
    <footer className="mt-8 space-y-3 rounded-3xl bg-footer px-5 py-6 text-sm text-footer-fg">
      <p role="note" className="font-medium">{t("disclaimer")}</p>
      <p>
        {t("attribution.prefix")}{" "}
        <a href="https://world.openfoodfacts.org" target="_blank" rel="noopener noreferrer" className="underline">
          {t("attribution.link")}
        </a>{" "}
        {t("attribution.licence")}
      </p>
    </footer>
  );
}
