"use client";
import { Icon } from "@/components/Icon";
import { useCallback, useEffect, useRef, useState } from "react";
import { t } from "@/i18n";
import { requestRecipes, type RecipeSource, type RecipesOutcome } from "@/lib/recipes/client";
import {
  getLocalQuota, grantRecipeConsent, hasRecipeConsent, quotaExhausted, syncLocalQuota, type LocalQuota,
} from "@/lib/recipes/local";
import type { Recipe } from "@/lib/recipes/types";
import { noteRecipesGenerated } from "@/lib/tracking";
import { RecipeCard } from "./RecipeCard";
import { RecipeConsent } from "./RecipeConsent";

type Phase = "consent" | "loading" | "done" | "error";
type ErrorKind = Exclude<RecipesOutcome["kind"], "ok" | "aborted">;

const ERROR_KEY: Record<ErrorKind, string> = {
  quota_exceeded: "recipes.error.quota",
  rate_limited: "recipes.error.rate",
  not_enough: "recipes.error.notenough",
  incompatible: "recipes.error.incompatible",
  unavailable: "recipes.error.unavailable",
  failed: "recipes.error.failed",
  offline: "recipes.error.offline",
  not_found: "recipes.error.notfound",
  invalid: "recipes.error.invalid",
};

/**
 * Générateur commun aux deux entrées (scan -> recettes, frigo -> recettes) : même consentement, même route,
 * mêmes états, mêmes messages. Mode dégradé : toute erreur est un message clair, jamais un détail technique.
 *
 * Aucune requête n'est émise avant l'accord « prestataire d'IA » (RecipeConsent), demandé une fois (version enregistrée).
 */
export function RecipeGenerator({ source, onClose }: { source: RecipeSource; onClose?: () => void }) {
  const [phase, setPhase] = useState<Phase>(() => (hasRecipeConsent() ? "loading" : "consent"));
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [error, setError] = useState<ErrorKind | null>(null);
  const [quota, setQuota] = useState<LocalQuota>(() => getLocalQuota());
  const mounted = useRef(false);
  const started = useRef(false);
  const busy = useRef(false);
  const regionRef = useRef<HTMLDivElement>(null);

  const run = useCallback(
    async (regenerate: boolean) => {
      if (busy.current) return;
      // « Régénérer » et le mode frigo ne sont jamais servis par le cache : inutile d'appeler si le quota local est épuisé.
      if ((regenerate || source.mode === "list") && quotaExhausted(getLocalQuota())) {
        setError("quota_exceeded");
        setPhase("error");
        return;
      }
      busy.current = true;
      setPhase("loading");
      setError(null);
      const out = await requestRecipes(source, { regenerate });
      busy.current = false;
      if (!mounted.current || out.kind === "aborted") return;
      if (out.kind === "ok") {
        setQuota(syncLocalQuota(out.quota, !out.cached));
        setRecipes(out.recipes);
        noteRecipesGenerated(out.recipes.map((r) => r.id)); // progression : recettes distinctes générées
        setPhase("done");
        return;
      }
      if (out.kind === "quota_exceeded") {
        const cur = getLocalQuota();
        setQuota(syncLocalQuota(out.quota ?? { limit: cur.limit ?? Math.max(cur.used, 1), used: cur.limit ?? Math.max(cur.used, 1) }, false));
      }
      setError(out.kind);
      setPhase("error");
    },
    [source],
  );

  useEffect(() => {
    mounted.current = true;
    if (!started.current && hasRecipeConsent()) {
      started.current = true;
      void run(false);
    }
    return () => { mounted.current = false; };
  }, [run]);

  // Les lecteurs d'écran sont prévenus quand le résultat arrive.
  useEffect(() => {
    if (phase === "done" || phase === "error") regionRef.current?.focus();
  }, [phase]);

  const accept = () => {
    grantRecipeConsent();
    started.current = true;
    void run(false);
  };

  if (phase === "consent") return <RecipeConsent onAccept={accept} onCancel={() => onClose?.()} />;

  return (
    <div ref={regionRef} tabIndex={-1} className="space-y-4 outline-none" aria-live="polite">
      {phase === "loading" && <p role="status" className="rounded-xl bg-surface p-4 text-lg">{t("recipes.loading")}</p>}

      {phase === "error" && error && (
        <section role="alert" className="space-y-3 rounded-2xl border-2 border-line-strong bg-surface p-4">
          <h2 className="text-lg font-semibold">{t("recipes.error.title")}</h2>
          <p>{t(ERROR_KEY[error])}</p>
          {error !== "quota_exceeded" && error !== "incompatible" && error !== "not_found" && error !== "invalid" && (
            <button type="button" className="btn-secondary" onClick={() => void run(true)}>{t("error.retry")}</button>
          )}
        </section>
      )}

      {phase === "done" && (
        <section aria-labelledby="rc-results" className="space-y-4">
          <h2 id="rc-results" className="text-lg font-semibold">{t("recipes.results")}</h2>
          <p role="note" className="rounded-xl border-2 border-warn-ring bg-warn-bg p-3 text-sm font-medium text-warn-fg">
            <Icon name="alert" className="me-1 h-4 w-4 align-[-0.15em]" />{t("recipes.disclaimer")}
          </p>
          <ul className="space-y-4">
            {recipes.map((r) => <li key={r.id}><RecipeCard recipe={r} /></li>)}
          </ul>
          <button type="button" className="btn-secondary" onClick={() => void run(true)}>
            <Icon name="refresh" className="me-2 h-5 w-5" />{t("recipes.regenerate")}
          </button>
        </section>
      )}

      {quota.limit !== null && phase !== "loading" && (
        <p className="text-sm text-muted">{t("recipes.quota", { used: Math.min(quota.used, quota.limit), limit: quota.limit })}</p>
      )}
    </div>
  );
}
