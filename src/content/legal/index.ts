import type { IconName } from "@/components/Icon";
import { AVERTISSEMENT } from "./avertissement";
import { CGU } from "./cgu";
import { CONFIDENTIALITE } from "./confidentialite";
import { LICENCES } from "./licences";
import { MENTIONS } from "./mentions";
import type { LegalBlock } from "./types";

export { LEGAL_UPDATED, LEGAL_VERSION } from "./version";
export type { LegalBlock } from "./types";

export type LegalSlug = "mentions" | "cgu" | "confidentialite" | "avertissement" | "licences";

export type LegalPage = {
  slug: LegalSlug;
  /** Clé i18n du libellé (menu des Réglages). */
  labelKey: string;
  /** Titre de la page (en français, comme le contenu). */
  title: string;
  icon: IconName;
  blocks: LegalBlock[];
};

/** Ordre = ordre d'affichage dans Réglages. */
export const LEGAL_PAGES: LegalPage[] = [
  { slug: "mentions", labelKey: "legal.notice", title: "Mentions légales", icon: "scale", blocks: MENTIONS },
  { slug: "cgu", labelKey: "legal.terms", title: "Conditions générales d'utilisation", icon: "file", blocks: CGU },
  { slug: "confidentialite", labelKey: "legal.privacy", title: "Politique de confidentialité", icon: "shield", blocks: CONFIDENTIALITE },
  { slug: "avertissement", labelKey: "legal.medical", title: "Avertissement médical", icon: "alert", blocks: AVERTISSEMENT },
  { slug: "licences", labelKey: "legal.licenses", title: "Licences et sources de données", icon: "database", blocks: LICENCES },
];

export const LEGAL_SLUGS = LEGAL_PAGES.map((p) => p.slug);

export function getLegalPage(slug: string): LegalPage | undefined {
  return LEGAL_PAGES.find((p) => p.slug === slug);
}

/** Chemin d'une page légale. */
export const legalHref = (slug: LegalSlug) => `/legal/${slug}`;

/** Adresse de contact (variable publique, non secrète). Vide tant qu'elle n'est pas renseignée. */
export const CONTACT_EMAIL = process.env.NEXT_PUBLIC_CONTACT_EMAIL ?? "";
