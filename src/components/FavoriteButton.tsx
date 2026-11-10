"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { t } from "@/i18n";
import { getActiveRuleSet } from "@/lib/ruleset";
import type { NormalizedProduct } from "@/lib/score/types";
import { CHANGE_EVENT, isFavorite, toggleFavorite } from "@/lib/storage";

/**
 * Bouton cœur. Les favoris sont stockés sur l'appareil, et seulement avec le consentement
 * d'enregistrement local (ils révèlent un intérêt alimentaire lié au profil santé).
 * Sans consentement : rien n'est écrit, on explique comment l'activer.
 */
export function FavoriteButton({ product, compact = false }: { product: NormalizedProduct; compact?: boolean }) {
  const [fav, setFav] = useState(false);
  const [denied, setDenied] = useState(false);

  useEffect(() => {
    const sync = () => setFav(isFavorite(product.code));
    sync();
    window.addEventListener(CHANGE_EVENT, sync);
    return () => window.removeEventListener(CHANGE_EVENT, sync);
  }, [product.code]);

  if (!product.code) return null;

  const onClick = () => {
    const r = toggleFavorite(product, getActiveRuleSet());
    setDenied(r === "denied");
    if (r !== "denied") setFav(r === "added");
  };

  const label = fav ? t("favorites.remove") : t("favorites.add");
  return (
    <div className={compact ? "shrink-0" : "space-y-2"}>
      <button
        type="button"
        onClick={onClick}
        aria-pressed={fav}
        aria-label={label}
        title={label}
        className={`inline-flex min-h-12 min-w-12 items-center justify-center rounded-xl border-2 border-primary text-2xl text-primary ${fav ? "bg-primary-soft" : "bg-surface"}`}
      >
        <span aria-hidden="true">{fav ? "♥" : "♡"}</span>
      </button>
      {denied && (
        <p role="alert" className="text-sm text-warn-fg">
          {t("favorites.needConsent")} <Link href="/settings" className="underline">{t("nav.settings")}</Link>
        </p>
      )}
    </div>
  );
}
