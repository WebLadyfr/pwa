"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { t } from "@/i18n";
import { refreshAll, type Favorite } from "@/lib/favorites";
import { getActiveRuleSet } from "@/lib/ruleset";
import { CHANGE_EVENT, consentStatus, getFavorites, removeFavorite, saveFavorites } from "@/lib/storage";
import { MiniScore } from "@/components/MiniScore";

export default function FavoritesPage() {
  const [favs, setFavs] = useState<Favorite[] | null>(null);
  const [enabled, setEnabled] = useState(false);

  useEffect(() => {
    const load = () => {
      setEnabled(consentStatus() === "granted");
      // À l'ouverture : recalcul avec les règles ACTUELLES (jamais un ancien score périmé).
      const { favs: fresh, changed } = refreshAll(getFavorites(), getActiveRuleSet());
      if (changed) saveFavorites(fresh); // déclenche CHANGE_EVENT -> rechargement, stable ensuite
      setFavs(fresh);
    };
    load();
    window.addEventListener(CHANGE_EVENT, load);
    return () => window.removeEventListener(CHANGE_EVENT, load);
  }, []);

  if (favs === null) return null;

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">{t("favorites.title")}</h1>
      {!enabled && <p>{t("favorites.disabled")} <Link href="/settings" className="underline">{t("nav.settings")}</Link></p>}
      {enabled && favs.length === 0 && <p>{t("favorites.empty")}</p>}
      <ul className="space-y-2">
        {favs.map((f) => (
          <li key={f.code} className="flex items-center gap-2 rounded-xl bg-surface p-2 shadow-sm">
            <Link href={`/product/${f.code}`} className="flex min-h-14 min-w-0 flex-1 items-center gap-3 p-1">
              <span className="min-w-0 flex-1">
                <span className="block font-medium">{f.product.name ?? t("result.unknownName")}</span>
                {f.product.brands && <span className="block text-sm text-muted">{f.product.brands}</span>}
                <span className="block text-sm text-muted">
                  {t("favorites.computed", { date: new Date(f.computed.at).toLocaleDateString("fr-FR") })}
                </span>
              </span>
              <MiniScore score={f.computed.score} level={f.computed.level} />
            </Link>
            <button
              type="button"
              onClick={() => removeFavorite(f.code)}
              aria-label={`${t("favorites.remove")} : ${f.product.name ?? f.code}`}
              className="inline-flex min-h-12 min-w-12 items-center justify-center rounded-xl border-2 border-primary bg-primary-soft text-2xl text-primary"
            >
              <span aria-hidden="true">♥</span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
