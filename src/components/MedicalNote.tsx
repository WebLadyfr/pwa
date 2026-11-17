import Link from "next/link";
import { t } from "@/i18n";
import { Icon } from "./Icon";

/** Rappel court (une ligne) de l'avertissement médical, sous le score. Texte : clé i18n « disclaimer.short ». */
export function MedicalNote() {
  return (
    <p role="note" className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-muted">
      <Icon name="info" className="h-4 w-4 shrink-0" />
      <span>{t("disclaimer.short")}</span>
      <Link href="/legal/avertissement" className="font-medium text-primary-ink underline underline-offset-2">{t("legal.learnmore")}</Link>
    </p>
  );
}
