import Link from "next/link";
import { t } from "@/i18n";

/** Mentions obligatoires visibles sur toutes les pages. */
export function Footer() {
  return (
    <footer className="space-y-3 border-t border-line py-6 text-sm text-muted">
      <p role="note" className="font-medium">{t("disclaimer")}</p>
      <p>
        {t("attribution.prefix")}{" "}
        <a href="https://world.openfoodfacts.org" target="_blank" rel="noopener noreferrer" className="underline">
          {t("attribution.link")}
        </a>{" "}
        {t("attribution.licence")}
      </p>
      <ul className="flex flex-wrap gap-x-4 gap-y-1">
        <li><Link href="/privacy" className="underline">{t("legal.privacy")}</Link></li>
        <li><Link href="/terms" className="underline">{t("legal.terms")}</Link></li>
        <li><Link href="/legal" className="underline">{t("legal.notice")}</Link></li>
      </ul>
    </footer>
  );
}
