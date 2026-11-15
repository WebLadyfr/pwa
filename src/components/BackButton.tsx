"use client";
import { useRouter } from "next/navigation";
import { t } from "@/i18n";
import { Icon } from "./Icon";

/** Bouton retour en haut des pages légales : revient à l'écran précédent, sinon à la liste des informations légales. */
export function BackButton({ fallback = "/legal" }: { fallback?: string }) {
  const router = useRouter();
  return (
    <button
      type="button"
      onClick={() => (window.history.length > 1 ? router.back() : router.push(fallback))}
      className="btn-secondary !mx-0 !w-auto !px-4"
    >
      <Icon name="chevron-left" className="h-4 w-4 rtl:rotate-180" />
      <span suppressHydrationWarning>{t("legal.back")}</span>
    </button>
  );
}
