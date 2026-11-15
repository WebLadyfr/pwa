import { notFound } from "next/navigation";
import { BackButton } from "@/components/BackButton";
import { Draft } from "@/components/Draft";
import { LegalText } from "@/components/LegalText";
import { LEGAL_PAGES, LEGAL_UPDATED, getLegalPage } from "@/content/legal";
import { t } from "@/i18n";

/** Pages légales : contenu dans src/content/legal/*.ts, une route par page (aucun autre slug n'existe). */
export const dynamicParams = false;
export function generateStaticParams() {
  return LEGAL_PAGES.map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const page = getLegalPage((await params).slug);
  return { title: page?.title ?? "Informations légales" };
}

export default async function LegalDocument({ params }: { params: Promise<{ slug: string }> }) {
  const page = getLegalPage((await params).slug);
  if (!page) notFound();
  const updated = new Date(`${LEGAL_UPDATED}T12:00:00Z`).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" });
  return (
    <div className="space-y-4">
      <BackButton />
      <article lang="fr" dir="ltr" aria-labelledby="lg-title" className="space-y-4 leading-relaxed">
        <h1 id="lg-title" className="text-xl font-semibold">{page.title}</h1>
        <p className="text-sm text-muted">Dernière mise à jour : <time dateTime={LEGAL_UPDATED}>{updated}</time></p>
        <Draft />
        {page.slug === "avertissement" && (
          <p role="note" className="rounded-2xl border-2 border-primary bg-primary-soft p-4 font-semibold">{t("disclaimer", undefined, "fr")}</p>
        )}
        <LegalText blocks={page.blocks} />
      </article>
    </div>
  );
}
