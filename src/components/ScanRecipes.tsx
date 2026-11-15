"use client";
import { Icon } from "@/components/Icon";
import Link from "next/link";
import { useMemo, useState } from "react";
import { t } from "@/i18n";
import { getActiveExclusions, type RecipeSource } from "@/lib/recipes/client";
import { productViolations } from "@/lib/recipes/revalidate";
import type { NormalizedProduct } from "@/lib/score/types";
import { RecipeGenerator } from "./RecipeGenerator";

/**
 * « Idées de recettes » sur la fiche d'un produit scanné. Le produit est l'ingrédient de départ ; le serveur
 * retrouve lui-même son nom à partir du code-barres (le client n'envoie que le code, les exclusions et la langue).
 * Un produit qui contient déjà un ingrédient exclu par les règles ne peut pas servir de base : on l'explique
 * plutôt que de lancer une génération vouée à l'échec.
 */
export function ScanRecipes({ product }: { product: NormalizedProduct }) {
  const [open, setOpen] = useState(false);
  const blocked = useMemo(() => productViolations(product, getActiveExclusions().exclusions).length > 0, [product]);
  const source = useMemo<RecipeSource | null>(() => (product.code ? { mode: "seed", code: product.code } : null), [product.code]);
  if (!source) return null;

  return (
    <section aria-labelledby="rc-scan" className="space-y-3 rounded-2xl bg-surface p-4 shadow-sm">
      <h2 id="rc-scan" className="text-lg font-semibold">{t("recipes.cta")}</h2>
      {blocked ? (
        <>
          <p role="note">{t("recipes.seed.incompatible")}</p>
          <Link href="/fridge" className="btn-secondary">{t("nav.fridge")}</Link>
        </>
      ) : open ? (
        <RecipeGenerator source={source} onClose={() => setOpen(false)} />
      ) : (
        <>
          <p className="text-muted">{t("recipes.cta.help")}</p>
          <button type="button" className="btn-primary" onClick={() => setOpen(true)}>
            <Icon name="utensils" className="me-2 h-5 w-5" />{t("recipes.cta")}
          </button>
        </>
      )}
    </section>
  );
}
