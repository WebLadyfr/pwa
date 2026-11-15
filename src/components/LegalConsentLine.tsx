import type { ReactNode } from "react";
import { t } from "@/i18n";

/**
 * Phrase du consentement avec liens vers les CGU et la politique de confidentialité.
 * Le modèle de phrase (« … {terms} … {privacy} … ») est traduit ; l'ordre des mots dépend de la langue.
 * Les liens s'ouvrent dans un nouvel onglet pour ne pas perdre la saisie en cours de l'onboarding.
 */
export function LegalConsentLine() {
  const link = (href: string, label: string) => (
    <a key={href} href={href} target="_blank" rel="noopener noreferrer" className="font-medium text-primary underline underline-offset-2">{label}</a>
  );
  const parts: ReactNode[] = t("onboarding.legal.sentence").split(/(\{terms\}|\{privacy\})/).map((p) => {
    if (p === "{terms}") return link("/legal/cgu", t("legal.terms"));
    if (p === "{privacy}") return link("/legal/confidentialite", t("legal.privacy"));
    return p;
  });
  return <p className="text-sm">{parts}</p>;
}
