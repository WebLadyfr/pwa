"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { dateLocale, t } from "@/i18n";
import { nextGoal, nextStep, overall, type ProgressInput } from "@/lib/progress";
import { getRecipeFavorites } from "@/lib/recipes/local";
import { normalizeQuery } from "@/lib/search-input";
import { setPendingSearch } from "@/lib/search-handoff";
import { CHANGE_EVENT, consentStatus } from "@/lib/storage";
import { daysTrackedLast7, getRecipeStatuses, getStats, getSymptoms, last7Days, type SymptomEntry } from "@/lib/tracking";
import { DayBars } from "./DayBars";
import { DietSwitch } from "./DietSwitch";
import { Icon } from "./Icon";
import { ProgressBar } from "./ProgressBar";
import { StackedBar } from "./StackedBar";

const EMPTY: ProgressInput = { scans: 0, recipesGenerated: 0, savedRecipes: 0, testedRecipes: 0, approvedRecipes: 0, symptomDays7: 0, symptomDaysTotal: 0 };

function load(): { input: ProgressInput; enabled: boolean; symptoms: SymptomEntry[] } {
  const enabled = consentStatus() === "granted";
  if (!enabled) return { input: EMPTY, enabled, symptoms: [] };
  const stats = getStats();
  const statuses = getRecipeStatuses();
  const saved = getRecipeFavorites();
  const symptoms = getSymptoms();
  return {
    enabled,
    symptoms,
    input: {
      scans: stats.scans,
      recipesGenerated: stats.recipeIds.length,
      savedRecipes: saved.length,
      testedRecipes: saved.filter((r) => statuses[r.id] === "tested" || statuses[r.id] === "approved").length,
      approvedRecipes: saved.filter((r) => statuses[r.id] === "approved").length,
      symptomDays7: daysTrackedLast7(symptoms),
      symptomDaysTotal: symptoms.length,
    },
  };
}

/** Accueil : recherche, accès rapides, régime, et barres de progression. */
export function Dashboard() {
  const router = useRouter();
  const [state, setState] = useState<{ input: ProgressInput; enabled: boolean; symptoms: SymptomEntry[] }>({ input: EMPTY, enabled: false, symptoms: [] });
  const [q, setQ] = useState("");
  const [invalid, setInvalid] = useState(false);

  useEffect(() => {
    const sync = () => setState(load());
    sync();
    window.addEventListener(CHANGE_EVENT, sync);
    return () => window.removeEventListener(CHANGE_EVENT, sync);
  }, []);

  const { input, enabled, symptoms } = state;
  const step = nextStep(input);
  const weekDays = useMemo(
    () => last7Days(symptoms).map((d) => ({
      key: d.key, avg: d.avg,
      short: d.date.toLocaleDateString(dateLocale(), { weekday: "narrow" }),
      long: d.date.toLocaleDateString(dateLocale(), { weekday: "long" }),
    })),
    [symptoms],
  );
  const global = useMemo(() => overall(input), [input]);
  const scanGoal = nextGoal(input.scans);
  const genGoal = nextGoal(input.recipesGenerated);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const check = normalizeQuery(q);
    if (!check.ok) { setInvalid(true); return; }
    setPendingSearch(check.q); // hors URL : le terme n'est écrit nulle part
    router.push("/search");
  };

  return (
    <div className="space-y-7">
      <form onSubmit={submit} role="search" data-tour="search-bar" noValidate className="space-y-2">
        <label htmlFor="home-q" className="sr-only">{t("search.label")}</label>
        <div className="flex items-center gap-2 rounded-full border-2 border-line-strong bg-surface p-1.5 ps-4 focus-within:border-primary">
          <Icon name="search" className="h-5 w-5 text-muted" />
          <input
            id="home-q"
            type="search"
            enterKeyHint="search"
            autoComplete="off"
            autoCorrect="off"
            spellCheck={false}
            maxLength={80}
            value={q}
            placeholder={t("home.search.placeholder")}
            onChange={(e) => { setQ(e.target.value); setInvalid(false); }}
            aria-invalid={invalid}
            aria-describedby={invalid ? "home-q-err" : undefined}
            className="min-h-10 min-w-0 flex-1 bg-transparent text-base outline-none"
          />
          <button type="submit" className="press min-h-10 shrink-0 rounded-[2rem] bg-primary px-4 text-sm font-semibold text-on-primary">{t("home.search.go")}</button>
        </div>
        {invalid && <p id="home-q-err" role="alert" className="text-bad-fg">{t("search.invalid")}</p>}
      </form>

      <nav aria-label={t("home.quick")} className="grid grid-cols-2 gap-2.5">
        <Link href="/scan" className="press btn-primary col-span-2"><Icon name="scan" className="h-4 w-4" />{t("home.scan")}</Link>
        <Link href="/label" data-tour="tile-label" className="press btn-secondary !px-3 !text-sm"><Icon name="tag" className="h-4 w-4" />{t("nav.label")}</Link>
        <Link href="/fridge" className="press btn-secondary !px-3 !text-sm"><Icon name="fridge" className="h-4 w-4" />{t("nav.fridge")}</Link>
        <Link href="/symptoms" className="press btn-secondary !px-3 !text-sm"><Icon name="clipboard" className="h-4 w-4" />{t("nav.symptoms")}</Link>
        <Link href="/history" className="press btn-secondary !px-3 !text-sm"><Icon name="clock" className="h-4 w-4" />{t("nav.history")}</Link>
      </nav>

      <DietSwitch />

      <section aria-labelledby="dash-progress" className="space-y-4 rounded-2xl bg-surface p-4 shadow-sm" data-tour="progress">
        <h2 id="dash-progress" className="font-semibold">{t("dash.title")}</h2>
        {!enabled ? (
          <p>{t("dash.disabled")} <Link href="/settings" className="underline">{t("nav.settings")}</Link></p>
        ) : (
          <>
            <ProgressBar label={t("dash.global")} value={global.done} goal={global.total} hint={step ? t("dash.next", { step: t(`dash.step.${step}`) }) : t("dash.alldone")} />
            <hr className="border-line" />
            <ProgressBar label={t("dash.scans")} value={input.scans} goal={scanGoal} />
            <ProgressBar label={t("dash.generated")} value={input.recipesGenerated} goal={genGoal} />
            <hr className="border-line" />
            <StackedBar
              label={t("dash.recipes")}
              emptyText={t("dash.recipes.empty")}
              segments={[
                { id: "to_test", label: t("dash.stack.totest"), value: Math.max(0, input.savedRecipes - input.testedRecipes), className: "bg-line-strong" },
                { id: "tested", label: t("dash.stack.tested"), value: Math.max(0, input.testedRecipes - input.approvedRecipes), className: "bg-primary" },
                { id: "approved", label: t("dash.stack.approved"), value: input.approvedRecipes, className: "bg-ok-ring" },
              ]}
            />
            <hr className="border-line" />
            <div className="space-y-2">
              <p className="font-medium">{t("dash.symptoms.chart")}</p>
              <DayBars label={t("dash.symptoms.chart")} days={weekDays} valueText={(d) => `${d.long} : ${d.avg === null ? t("symptoms.none") : d.avg.toFixed(1)}`} />
              <p className="text-sm text-muted">{t("symptoms.week.count", { n: input.symptomDays7 })}</p>
            </div>
          </>
        )}
      </section>
    </div>
  );
}
