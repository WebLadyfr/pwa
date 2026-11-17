"use client";
import { Icon } from "@/components/Icon";
import Link from "next/link";
import { useEffect, useState } from "react";
import { t } from "@/i18n";
import { getRecipeFavorites } from "@/lib/recipes/local";
import type { Recipe } from "@/lib/recipes/types";
import { CHANGE_EVENT, consentStatus } from "@/lib/storage";
import { RecipeCard } from "@/components/RecipeCard";

/**
 * Recettes enregistrées. Lues depuis le stockage de l'appareil (jamais du réseau) : disponibles hors ligne,
 * une fois cette page mise en cache par le service worker lors d'une première visite.
 */
export default function SavedRecipesPage() {
  const [recipes, setRecipes] = useState<Recipe[] | null>(null);
  const [enabled, setEnabled] = useState(false);

  useEffect(() => {
    const load = () => {
      setEnabled(consentStatus() === "granted");
      setRecipes(getRecipeFavorites());
    };
    load();
    window.addEventListener(CHANGE_EVENT, load);
    return () => window.removeEventListener(CHANGE_EVENT, load);
  }, []);

  if (recipes === null) return null;

  return (
    <div className="space-y-4 [&_.btn-primary]:!min-h-12 [&_.btn-primary]:!text-lg [&_.btn-secondary]:!min-h-12 [&_.btn-secondary]:!text-lg">
      <h1 className="text-xl font-semibold">{t("recipes.saved.title")}</h1>
      {!enabled && <p>{t("recipes.saved.disabled")} <Link href="/settings" className="underline">{t("nav.settings")}</Link></p>}
      {enabled && recipes.length === 0 && <p>{t("recipes.saved.empty")}</p>}
      {recipes.length > 0 && (
        <>
          <p role="note" className="rounded-xl border-2 border-warn-ring bg-warn-bg p-3 text-sm font-medium text-warn-fg">
            <Icon name="alert" className="me-1 h-4 w-4 align-[-0.15em]" />{t("recipes.disclaimer")}
          </p>
          <p className="text-sm text-muted">{t("recipes.saved.offline")}</p>
          <ul className="space-y-4">
            {recipes.map((r) => <li key={r.id}><RecipeCard recipe={r} /></li>)}
          </ul>
        </>
      )}
      <Link href="/fridge" className="btn-secondary btn-alt">{t("nav.fridge")}</Link>
    </div>
  );
}
