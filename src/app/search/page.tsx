"use client";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { t } from "@/i18n";
import { searchByName, type SearchOutcome } from "@/lib/client";
import { getActiveRuleSet } from "@/lib/ruleset";
import { evaluate } from "@/lib/score/engine";
import { normalizeQuery } from "@/lib/search-input";
import { FavoriteButton } from "@/components/FavoriteButton";
import { MiniScore } from "@/components/MiniScore";
import { StateMessage } from "@/components/StateMessage";
import type { NormalizedProduct } from "@/lib/score/types";

const DEBOUNCE_MS = 450;

/**
 * Recherche par nom. Le terme vit UNIQUEMENT dans l'état du composant : il n'est ni dans l'URL
 * (pas d'historique de navigation, pas de Referer), ni dans localStorage, ni journalisé.
 */
export default function SearchPage() {
  const [input, setInput] = useState("");
  const [state, setState] = useState<"idle" | "loading" | SearchOutcome>("idle");
  const check = useMemo(() => normalizeQuery(input), [input]);
  const ruleSet = useMemo(() => getActiveRuleSet(), []);

  useEffect(() => {
    if (!check.ok) {
      setState("idle");
      return;
    }
    const ctl = new AbortController();
    setState("loading");
    // Saisie différée : on n'appelle l'API que quand l'utilisateur s'arrête de taper.
    const timer = setTimeout(() => {
      searchByName(check.q, ctl.signal).then((r) => { if (r.kind !== "aborted") setState(r); });
    }, DEBOUNCE_MS);
    return () => { clearTimeout(timer); ctl.abort(); };
  }, [check]);

  const invalidChars = !check.ok && check.reason === "chars";

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">{t("search.title")}</h1>
      <div className="space-y-2">
        <label htmlFor="q" className="block">{t("search.label")}</label>
        <input
          id="q"
          type="search"
          enterKeyHint="search"
          autoComplete="off"
          autoCorrect="off"
          spellCheck={false}
          maxLength={80}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          aria-invalid={invalidChars}
          aria-describedby="q-hint"
          className="w-full rounded-xl border-2 border-line-strong bg-surface p-3 text-lg"
        />
        <p id="q-hint" className={invalidChars ? "text-bad-fg" : "text-sm text-muted"} role={invalidChars ? "alert" : undefined}>
          {invalidChars ? t("search.invalid") : t("search.hint")}
        </p>
      </div>

      <div aria-live="polite">
        {state === "loading" && <p role="status">{t("search.loading")}</p>}
        {typeof state === "object" && state.kind === "ok" && state.products.length === 0 && <p>{t("search.empty")}</p>}
      </div>

      {typeof state === "object" && state.kind === "ok" && state.products.length > 0 && (
        <section aria-label={t("search.results")}>
          <ul className="space-y-2">
            {state.products.map((p) => <ResultRow key={p.code} p={p} score={evaluate(p, ruleSet)} />)}
          </ul>
        </section>
      )}

      {typeof state === "object" && state.kind !== "ok" && state.kind !== "invalid" && state.kind !== "aborted" && <StateMessage kind={state.kind} />}

      <p className="text-sm text-muted">{t("search.privacy")}</p>
    </div>
  );
}

function ResultRow({ p, score }: { p: NormalizedProduct; score: ReturnType<typeof evaluate> }) {
  return (
    <li className="flex items-center gap-2 rounded-xl bg-surface p-2 shadow-sm">
      <Link href={`/product/${p.code}`} className="flex min-h-14 min-w-0 flex-1 items-center gap-3 p-1">
        {p.imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={p.imageUrl} alt="" width={48} height={48} loading="lazy" referrerPolicy="no-referrer" className="h-12 w-12 shrink-0 rounded-lg bg-canvas object-contain" />
        ) : (
          <span aria-hidden="true" className="h-12 w-12 shrink-0 rounded-lg bg-canvas" />
        )}
        <span className="min-w-0 flex-1">
          <span className="block font-medium">{p.name}</span>
          {p.brands && <span className="block text-sm text-muted">{p.brands}</span>}
        </span>
        {score.status === "scored" ? <MiniScore score={score.score} level={score.level} /> : <MiniScore score={null} level={null} />}
      </Link>
      <FavoriteButton product={p} compact />
    </li>
  );
}
