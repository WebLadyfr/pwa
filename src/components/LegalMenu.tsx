import Link from "next/link";
import { t } from "@/i18n";
import { CONTACT_EMAIL, LEGAL_PAGES, legalHref } from "@/content/legal";
import { Icon, type IconName } from "./Icon";

const ROW = "press flex min-h-12 items-center gap-3 rounded-2xl bg-surface px-4 py-2 font-medium shadow-sm";

function Row({ icon, children }: { icon: IconName; children: React.ReactNode }) {
  return (
    <>
      <Icon name={icon} className="h-5 w-5 shrink-0 text-primary-ink" />
      <span className="min-w-0 flex-1">{children}</span>
      <Icon name="chevron-right" className="h-5 w-5 shrink-0 text-muted rtl:rotate-180" />
    </>
  );
}

/** Liste « À propos et informations légales » : icône à gauche, chevron à droite, version de l'app en bas (non cliquable). */
export function LegalMenu() {
  const version = process.env.NEXT_PUBLIC_APP_VERSION ?? "";
  return (
    <>
      <ul className="space-y-2">
        {LEGAL_PAGES.map((p) => (
          <li key={p.slug}>
            <Link href={legalHref(p.slug)} className={ROW}><Row icon={p.icon}>{t(p.labelKey)}</Row></Link>
          </li>
        ))}
        <li>
          {CONTACT_EMAIL ? (
            <a href={`mailto:${CONTACT_EMAIL}`} className={ROW}><Row icon="mail">{t("legal.contact")}</Row></a>
          ) : (
            <Link href={legalHref("mentions")} className={ROW}><Row icon="mail">{t("legal.contact")}</Row></Link>
          )}
        </li>
      </ul>
      {version && <p className="mt-3 text-sm text-muted">{t("legal.version", { v: version })}</p>}
    </>
  );
}
