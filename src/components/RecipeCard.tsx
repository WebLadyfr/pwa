"use client";
import { Icon } from "@/components/Icon";
import Link from "next/link";
import { useEffect, useState } from "react";
import { t } from "@/i18n";
import { GiBadge } from "./GiBadge";
import { MAX_RECIPE_FAVORITES, isRecipeFavorite, toggleRecipeFavorite } from "@/lib/recipes/local";
import type { Recipe } from "@/lib/recipes/types";
import { CHANGE_EVENT } from "@/lib/storage";
import { RECIPE_STATUSES, getRecipeStatuses, setRecipeStatus, type RecipeStatus } from "@/lib/tracking";

/**
 * Carte de recette sobre. Tout le texte vient du modèle (non fiable) : il a été assaini et revalidé, et React
 * l'échappe à l'affichage (aucun dangerouslySetInnerHTML dans le projet).
 * Le disclaimer figure sur CHAQUE carte (une carte copiée ou capturée seule reste accompagnée de l'avertissement).
 */
export function RecipeCard({ recipe }: { recipe: Recipe }) {
  const [fav, setFav] = useState(false);
  const [note, setNote] = useState<"denied" | "full" | null>(null);
  const [status, setStatus] = useState<RecipeStatus>("to_test");

  useEffect(() => {
    const sync = () => {
      setFav(isRecipeFavorite(recipe.id));
      setStatus(getRecipeStatuses()[recipe.id] ?? "to_test");
    };
    sync();
    window.addEventListener(CHANGE_EVENT, sync);
    return () => window.removeEventListener(CHANGE_EVENT, sync);
  }, [recipe.id]);

  const onFav = () => {
    const r = toggleRecipeFavorite(recipe);
    setNote(r === "denied" || r === "full" ? r : null);
    if (r === "added" || r === "removed") setFav(r === "added");
  };
  const favLabel = fav ? t("recipes.fav.remove") : t("recipes.fav.add");
  const headingId = `rc-${recipe.id}`;

  return (
    <article aria-labelledby={headingId} className="space-y-4 rounded-2xl border-2 border-line bg-surface p-4 shadow-sm">
      <header className="flex items-start gap-3">
        <div className="min-w-0 flex-1">
          <h3 id={headingId} className="break-words text-lg font-semibold">{recipe.title}</h3>
          <p className="text-sm text-muted">
            <Icon name="clock" className="me-1 h-4 w-4 align-[-0.15em]" />{t("recipes.minutes", { n: recipe.minutes })}
            <span aria-hidden="true"> · </span><span className="sr-only">, </span>
            {t("recipes.servings", { n: recipe.servings })}
          </p>
        </div>
        <button
          type="button"
          onClick={onFav}
          aria-pressed={fav}
          aria-label={favLabel}
          title={favLabel}
          className={`inline-flex min-h-10 min-w-10 shrink-0 items-center justify-center rounded-full border-2 border-primary-ink text-primary-ink ${fav ? "bg-primary-soft" : "bg-surface"}`}
        >
          <Icon name="heart" filled={fav} className="h-5 w-5" />
        </button>
      </header>

      {fav && (
        <fieldset className="space-y-2">
          <legend className="mb-1 text-sm font-semibold">{t("recipes.status.title")}</legend>
          <div className="grid grid-cols-3 gap-2">
            {RECIPE_STATUSES.map((s) => (
              <label
                key={s}
                className="press flex min-h-10 cursor-pointer items-center justify-center rounded-full border-2 border-line-strong bg-surface px-1 text-center text-sm font-medium has-[:checked]:border-primary-ink has-[:checked]:bg-primary has-[:checked]:text-on-primary"
              >
                <input
                  type="radio"
                  name={`status-${recipe.id}`}
                  value={s}
                  checked={status === s}
                  onChange={() => { setStatus(s); setRecipeStatus(recipe.id, s); }}
                  className="sr-only"
                />
                {t(`recipes.status.${s}`)}
              </label>
            ))}
          </div>
        </fieldset>
      )}

      {note === "denied" && (
        <p role="alert" className="text-sm text-warn-fg">
          {t("recipes.fav.needConsent")} <Link href="/settings" className="underline">{t("nav.settings")}</Link>
        </p>
      )}
      {note === "full" && <p role="alert" className="text-sm text-warn-fg">{t("recipes.fav.full", { max: MAX_RECIPE_FAVORITES })}</p>}

      <section aria-label={t("recipes.ingredients")}>
        <h4 className="mb-1 font-semibold">{t("recipes.ingredients")}</h4>
        <ul className="space-y-1">
          {recipe.ingredients.map((i, k) => (
            <li key={k} className="flex gap-2">
              <span aria-hidden="true">•</span>
              <span><span className="font-medium">{i.quantity}</span> {i.name}</span>
            </li>
          ))}
        </ul>
      </section>

      <section aria-label={t("recipes.steps")}>
        <h4 className="mb-1 font-semibold">{t("recipes.steps")}</h4>
        <ol className="list-inside list-decimal space-y-1.5">
          {recipe.steps.map((s, k) => <li key={k}>{s}</li>)}
        </ol>
      </section>

      {recipe.glycemic && (
        <p className="flex flex-wrap items-center gap-2 text-sm">
          <GiBadge level={recipe.glycemic} />
          <span className="text-muted">{t("gi.recipe.note")}</span>
        </p>
      )}

      {recipe.tip && (
        <p className="rounded-xl bg-primary-soft p-3 text-base">
          <span className="font-semibold">{t("recipes.tip")} : </span>{recipe.tip}
        </p>
      )}

      <p role="note" className="border-t border-line pt-3 text-sm text-muted">{t("recipes.disclaimer")}</p>
    </article>
  );
}
