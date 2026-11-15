"use client";
import { MedicalNote } from "./MedicalNote";
import Link from "next/link";
import { Icon, type IconName } from "@/components/Icon";
import { useEffect, useMemo, useRef, useState } from "react";
import { t, tagLabel } from "@/i18n";
import { evaluate } from "@/lib/score/engine";
import type { NormalizedProduct, Reason, Severity } from "@/lib/score/types";
import { getActiveRuleSet } from "@/lib/ruleset";
import { addHistory, getDietMode, updateFavoriteSnapshot } from "@/lib/storage";
import { bumpScan } from "@/lib/tracking";
import { veggieStatus } from "@/lib/veggie";
import { halalStatus } from "@/lib/halal";
import { estimateGlycemicIndex } from "@/lib/glycemic";
import { GiBadge } from "./GiBadge";
import { fetchAlternative } from "@/lib/client";
import { getProfileIds } from "@/lib/storage";
import { ScoreBadge } from "./ScoreBadge";
import { FavoriteButton } from "./FavoriteButton";
import { ScanRecipes } from "./ScanRecipes";

const SEV_ICON: Record<Severity, IconName> = { negative: "x-circle", warning: "alert", info: "info", positive: "check" };
const SEV_COLOR: Record<Severity, string> = {
  negative: "text-bad-fg",
  warning: "text-warn-fg",
  info: "text-muted",
  positive: "text-ok-fg",
};

function ReasonItem({ r, showProfiles }: { r: Reason; showProfiles: boolean }) {
  // Les items proviennent de tags validés ; React échappe le texte de toute façon.
  const text = t(r.reasonKey, { items: r.items.map((i) => tagLabel(i)).join(", ") });
  return (
    <li className="flex gap-3 rounded-xl bg-surface p-3 text-base leading-snug shadow-sm">
      <span className={`mt-0.5 shrink-0 ${SEV_COLOR[r.severity]}`}><Icon name={SEV_ICON[r.severity]} className="h-5 w-5" /></span>
      <span>
        <span className="sr-only">{t(`sev.${r.severity}`)} : </span>
        {text}
        {showProfiles && r.profiles && r.profiles.length > 0 && (r.points < 0 || r.severity === "warning") && (
          <span className="mt-1 block text-sm text-muted">
            {t("result.concerns", { profiles: r.profiles.map((p) => t(`profile.${p}`)).join(", ") })}
          </span>
        )}
      </span>
    </li>
  );
}

export function ResultScreen({ product, source }: { product: NormalizedProduct; source: "barcode" | "label" }) {
  const ruleSet = useMemo(() => getActiveRuleSet(), []);
  const result = useMemo(() => evaluate(product, ruleSet), [product, ruleSet]);
  const profileCount = useMemo(() => getProfileIds().length, []);
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
    bumpScan(); // compteur de progression (uniquement avec l'accord d'enregistrement local)
  }, [product, result, ruleSet, source]);

  useEffect(() => {
    if (source !== "barcode" || !product.code || result.status !== "scored" || result.level === "green") return;
    let cancelled = false;
    setAlt("loading");
    fetchAlternative(product.code, ruleSet, result.score).then((a) => !cancelled && setAlt(a));
    return () => { cancelled = true; };
  }, [product.code, result, ruleSet, source]);

  const veggie = useMemo(() => veggieStatus(product), [product]);
  const halal = useMemo(() => halalStatus(product), [product]);
  const gi = useMemo(() => estimateGlycemicIndex(product), [product]);
  const testMode = useMemo(() => getDietMode() === "test", []);
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
          <MedicalNote />
          <section aria-labelledby="why">
            <h2 id="why" className="mb-2 text-lg font-semibold">{t("result.why")}</h2>
            {result.reasons.length === 0 ? (
              <p>{t("result.nothing")}</p>
            ) : (
              <ul className="space-y-2">{result.reasons.map((r) => <ReasonItem key={r.ruleId} r={r} showProfiles={profileCount > 1} />)}</ul>
            )}
          </section>
          {testMode && result.reasons.some((r) => r.points < 0) && (
            <section role="note" className="space-y-2 rounded-2xl border-2 border-primary bg-primary-soft p-4">
              <p><Icon name="flask" className="me-1.5 h-5 w-5 align-[-0.2em]" />{t("diet.test.hint")}</p>
              <Link href="/symptoms" className="btn-secondary">{t("diet.test.cta")}</Link>
            </section>
          )}
          {result.draftRules && <p className="text-sm text-muted">{t("draft.notice")}</p>}
        </>
      )}

      {veggie.status !== "unknown" && (
        <section aria-labelledby="veggie" className="space-y-2 rounded-2xl bg-surface p-4 shadow-sm">
          <h2 id="veggie" className="text-lg font-semibold">{t("veggie.title")}</h2>
          <p className="font-medium">
            <Icon name={veggie.status === "vegan" ? "leaf" : veggie.status === "vegetarian" ? "egg" : "meat"} className="me-1.5 h-5 w-5 align-[-0.2em]" />
            {t(`veggie.${veggie.status}`)}
          </p>
          {veggie.status === "not_vegetarian" && <p className="text-sm">{t("veggie.because", { items: veggie.animal.map((i) => tagLabel(i)).join(", ") })}</p>}
          {veggie.status === "vegetarian" && <p className="text-sm">{t("veggie.because", { items: veggie.nonVegan.map((i) => tagLabel(i)).join(", ") })}</p>}
          {veggie.status !== "not_vegetarian" && veggie.uncertain.length > 0 && (
            <p className="text-sm text-warn-fg"><Icon name="alert" className="me-1 h-4 w-4 align-[-0.15em]" />{t("veggie.uncertain", { items: veggie.uncertain.map((i) => tagLabel(i)).join(", ") })}</p>
          )}
          <p className="text-sm text-muted">{t("veggie.note")}</p>
        </section>
      )}

      {gi.status !== "unknown" && (
        <section aria-labelledby="gi" className="space-y-2 rounded-2xl bg-surface p-4 shadow-sm">
          <h2 id="gi" className="text-lg font-semibold">{t("gi.title")}</h2>
          {gi.status === "estimate" ? (
            <>
              <p><GiBadge level={gi.level} value={gi.value} /></p>
              <p className="text-sm">{t("gi.basis", { items: gi.basis.map((i) => tagLabel(i)).join(", ") })}</p>
            </>
          ) : (
            <p className="text-sm">{t("gi.nocarbs")}</p>
          )}
          <p className="text-sm text-muted">{t("gi.note")}</p>
        </section>
      )}

      {halal.status !== "unknown" && (
        <section aria-labelledby="halal" className="space-y-2 rounded-2xl bg-surface p-4 shadow-sm">
          <h2 id="halal" className="text-lg font-semibold">{t("halal.title")}</h2>
          <p className="font-medium">
            <Icon name={halal.status === "not_halal" ? "x-circle" : halal.status === "check" ? "alert" : "shield"} className="me-1.5 h-5 w-5 align-[-0.2em]" />
            {t(`halal.${halal.status}`)}
          </p>
          {halal.status === "not_halal" && <p className="text-sm">{t("halal.because", { items: halal.forbidden.map((i) => tagLabel(i)).join(", ") })}</p>}
          {halal.status === "check" && halal.meat.length > 0 && <p className="text-sm">{t("halal.meat", { items: halal.meat.map((i) => tagLabel(i)).join(", ") })}</p>}
          {halal.status === "check" && halal.doubtful.length > 0 && <p className="text-sm">{t("halal.doubtful", { items: halal.doubtful.map((i) => tagLabel(i)).join(", ") })}</p>}
          <p className="text-sm text-muted">{t("halal.note")}</p>
        </section>
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

      {source === "barcode" && product.code && <ScanRecipes product={product} />}

      <Link href="/" className="btn-primary">{t("result.back")}</Link>
    </div>
  );
}
