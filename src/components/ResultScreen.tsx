"use client";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { t, tagLabel } from "@/i18n";
import { evaluate } from "@/lib/score/engine";
import type { NormalizedProduct, Reason, Severity } from "@/lib/score/types";
import { getActiveRuleSet } from "@/lib/ruleset";
import { addHistory, updateFavoriteSnapshot } from "@/lib/storage";
import { fetchAlternative } from "@/lib/client";
import { ScoreBadge } from "./ScoreBadge";
import { FavoriteButton } from "./FavoriteButton";

const SEV_ICON: Record<Severity, string> = { negative: "✖", warning: "▲", info: "ℹ", positive: "✔" };
const SEV_COLOR: Record<Severity, string> = {
  negative: "text-bad-fg",
  warning: "text-warn-fg",
  info: "text-muted",
  positive: "text-ok-fg",
};

function ReasonItem({ r }: { r: Reason }) {
  // Les items proviennent de tags validés ; React échappe le texte de toute façon.
  const text = t(r.reasonKey, { items: r.items.map((i) => tagLabel(i)).join(", ") });
  return (
    <li className="flex gap-3 rounded-xl bg-surface p-3 text-base leading-snug shadow-sm">
      <span aria-hidden="true" className={`mt-0.5 w-5 shrink-0 text-center font-bold ${SEV_COLOR[r.severity]}`}>{SEV_ICON[r.severity]}</span>
      <span>
        <span className="sr-only">{t(`sev.${r.severity}`)} : </span>
        {text}
      </span>
    </li>
  );
}

export function ResultScreen({ product, source }: { product: NormalizedProduct; source: "barcode" | "label" }) {
  const ruleSet = useMemo(() => getActiveRuleSet(), []);
  const result = useMemo(() => evaluate(product, ruleSet), [product, ruleSet]);
  const [alt, setAlt] = useState<Awaited<ReturnType<typeof fetchAlternative>> | "loading" | null>(null);
  const savedRef = useRef<NormalizedProduct | null>(null);

  // Historique : addHistory n'écrit que si le consentement est accordé (choisi à l'onboarding).
  useEffect(() => {
    if (savedRef.current === product) return;
    savedRef.current = product;
    addHistory({
      source,
      code: product.code,
      name: product.name,
      brands: product.brands,
      status: result.status,
      score: result.status === "scored" ? result.score : null,
      level: result.status === "scored" ? result.level : null,
    });
    // Si c'est un favori, son instantané est rafraîchi avec les données fraîches.
    updateFavoriteSnapshot(product, ruleSet);
  }, [product, result, ruleSet, source]);

  useEffect(() => {
    if (source !== "barcode" || !product.code || result.status !== "scored" || result.level === "green") return;
    let cancelled = false;
    setAlt("loading");
    fetchAlternative(product.code).then((a) => !cancelled && setAlt(a));
    return () => { cancelled = true; };
  }, [product.code, result, source]);

  const title = product.name ?? (source === "label" ? t("label.result.name") : t("result.unknownName"));

  return (
    <div className="space-y-5">
      <header className="flex items-center gap-4">
        {product.imageUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={product.imageUrl} alt="" width={72} height={72} className="h-18 w-18 rounded-xl bg-surface object-contain" referrerPolicy="no-referrer" />
        )}
        <div className="min-w-0 flex-1">
          <h1 className="break-words text-xl font-semibold">{title}</h1>
          {product.brands && <p className="text-muted">{product.brands}</p>}
        </div>
        {source === "barcode" && <FavoriteButton product={product} compact />}
      </header>

      {result.status === "insufficient" ? (
        <section role="status" className="rounded-2xl border-2 border-line-strong bg-surface p-5">
          <h2 className="text-xl font-semibold"><span aria-hidden="true">？ </span>{t("result.insufficient.title")}</h2>
          <p className="mt-2 text-base">{t("result.insufficient.body")}</p>
          {source === "barcode" && <Link href="/label" className="btn-primary mt-4">{t("result.insufficient.cta")}</Link>}
        </section>
      ) : (
        <>
          <ScoreBadge score={result.score} level={result.level} />
          <section aria-labelledby="why">
            <h2 id="why" className="mb-2 text-lg font-semibold">{t("result.why")}</h2>
            {result.reasons.length === 0 ? (
              <p>{t("result.nothing")}</p>
            ) : (
              <ul className="space-y-2">{result.reasons.map((r) => <ReasonItem key={r.ruleId} r={r} />)}</ul>
            )}
          </section>
          {result.draftRules && <p className="text-sm text-muted">{t("draft.notice")}</p>}
        </>
      )}

      {alt === "loading" && <p className="text-muted" role="status">{t("result.alt.loading")}</p>}
      {alt && alt !== "loading" && (
        <section aria-labelledby="alt" className="rounded-2xl bg-primary-soft p-4">
          <h2 id="alt" className="font-semibold">{t("result.alt.title")}</h2>
          <Link href={`/product/${alt.code}`} className="mt-1 block text-primary underline underline-offset-2">
            {alt.name}{alt.brands ? ` — ${alt.brands}` : ""}
          </Link>
          <p className="text-sm">{t("result.alt.score", { score: alt.score })}</p>
        </section>
      )}

      <Link href="/" className="btn-primary">{t("result.back")}</Link>
    </div>
  );
}
