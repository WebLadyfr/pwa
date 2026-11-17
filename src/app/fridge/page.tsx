"use client";
import { Icon } from "@/components/Icon";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { t } from "@/i18n";
import { fetchProduct } from "@/lib/client";
import { getActiveExclusions, type RecipeSource } from "@/lib/recipes/client";
import { MAX_INGREDIENTS, shortIngredientName } from "@/lib/recipes/input";
import { MAX_FRIDGE, addFridgeItem, getFridge, removeFridgeItem, type FridgeItem } from "@/lib/recipes/local";
import { productViolations } from "@/lib/recipes/revalidate";
import { suggest } from "@/lib/recipes/suggestions";
import { CHANGE_EVENT, consentStatus } from "@/lib/storage";
import { ManualEntry } from "@/components/ManualEntry";
import { RecipeGenerator } from "@/components/RecipeGenerator";
import { Scanner } from "@/components/Scanner";

type Notice = { kind: "info" | "error"; text: string } | null;

/**
 * « Mon frigo » : la liste est stockée UNIQUEMENT sur l'appareil. Elle ne part vers le serveur que lorsque l'utilisatrice
 * demande des recettes (après l'écran de transparence), et seulement les aliments cochés (15 maximum par demande).
 * Les aliments que les règles du profil excluent sont signalés et jamais envoyés.
 */
export default function FridgePage() {
  const [items, setItems] = useState<FridgeItem[] | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [input, setInput] = useState("");
  const [notice, setNotice] = useState<Notice>(null);
  const [scanning, setScanning] = useState(false);
  const [persisted, setPersisted] = useState(true);
  const [gen, setGen] = useState<{ key: number; source: RecipeSource } | null>(null);
  const seen = useRef<Set<string>>(new Set());
  const exclusions = useMemo(() => getActiveExclusions().exclusions, []);

  const blockedIds = useMemo(() => {
    const s = new Set<string>();
    for (const i of items ?? []) if (productViolations({ name: i.name, ingredientsTags: i.tags }, exclusions).length > 0) s.add(i.id);
    return s;
  }, [items, exclusions]);

  useEffect(() => {
    const load = () => {
      setItems(getFridge());
      setPersisted(consentStatus() === "granted");
    };
    load();
    window.addEventListener(CHANGE_EVENT, load);
    return () => window.removeEventListener(CHANGE_EVENT, load);
  }, []);

  // Sélection : les nouveaux aliments compatibles sont cochés tant qu'il reste de la place (max 15), jamais les incompatibles.
  useEffect(() => {
    if (!items) return;
    setSelected((prev) => {
      const ids = new Set(items.map((i) => i.id));
      const next = new Set([...prev].filter((id) => ids.has(id) && !blockedIds.has(id)));
      for (const i of items) {
        if (seen.current.has(i.id)) continue;
        seen.current.add(i.id);
        if (!blockedIds.has(i.id) && next.size < MAX_INGREDIENTS) next.add(i.id);
      }
      return next;
    });
  }, [items, blockedIds]);

  const suggestions = useMemo(() => suggest(input, (items ?? []).map((i) => i.name)), [input, items]);

  const add = useCallback((name: string, extra?: { code?: string | null; tags?: string[] }) => {
    const r = addFridgeItem(name, extra);
    if (r === "added") {
      setInput("");
      setNotice(null);
    } else {
      setNotice({
        kind: "error",
        text: r === "duplicate" ? t("fridge.add.duplicate") : r === "full" ? t("fridge.add.full", { max: MAX_FRIDGE }) : t("fridge.add.invalid"),
      });
    }
    return r;
  }, []);

  const onScan = useCallback(
    async (code: string) => {
      setScanning(false);
      const out = await fetchProduct(code);
      if (out.kind === "not_found") return setNotice({ kind: "error", text: t("fridge.scan.notfound") });
      if (out.kind !== "ok") return setNotice({ kind: "error", text: t("fridge.scan.error") });
      const name = shortIngredientName(out.product.name);
      if (!name) return setNotice({ kind: "error", text: t("fridge.scan.notfound") });
      const r = add(name, { code: out.product.code, tags: [...out.product.ingredientsTags, ...out.product.allergensTags, ...out.product.additivesTags] });
      if (r === "added") setNotice({ kind: "info", text: t("fridge.scan.added", { name }) });
    },
    [add],
  );

  const toggle = (id: string) =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else if (next.size < MAX_INGREDIENTS && !blockedIds.has(id)) next.add(id);
      return next;
    });

  const generate = () => {
    const ingredients = (items ?? []).filter((i) => selected.has(i.id) && !blockedIds.has(i.id)).map((i) => i.name).slice(0, MAX_INGREDIENTS);
    if (ingredients.length === 0) return;
    setGen({ key: Date.now(), source: { mode: "list", ingredients } });
  };

  if (items === null) return null;
  const atMax = selected.size >= MAX_INGREDIENTS;

  return (
    <div className="space-y-6">
      <header className="space-y-2">
        <h1 className="text-xl font-semibold">{t("fridge.title")}</h1>
        <p>{t("fridge.intro")}</p>
      </header>

      <form
        className="space-y-3"
        noValidate
        onSubmit={(e) => {
          e.preventDefault();
          add(input);
        }}
      >
        <label htmlFor="fridge-input" className="block font-medium">{t("fridge.add.label")}</label>
        <div className="flex gap-2">
          <input
            id="fridge-input"
            type="text"
            autoComplete="off"
            autoCorrect="off"
            spellCheck={false}
            maxLength={60}
            value={input}
            onChange={(e) => { setInput(e.target.value); setNotice(null); }}
            className="min-w-0 flex-1 rounded-xl border-2 border-line-strong bg-surface p-3 text-lg"
          />
          <button type="submit" className="btn-primary !w-auto shrink-0">{t("fridge.add.submit")}</button>
        </div>
        {suggestions.length > 0 && (
          <div>
            <p className="mb-1 text-sm text-muted" id="fridge-sugg">{t("fridge.suggestions")}</p>
            <ul aria-labelledby="fridge-sugg" className="flex flex-wrap gap-2">
              {suggestions.map((s) => (
                <li key={s}>
                  <button type="button" onClick={() => add(s)} className="min-h-10 rounded-full border-2 border-primary-ink bg-surface px-4 py-1.5 text-sm text-primary-ink">
                    <span aria-hidden="true">+ </span>{s}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}
        <div aria-live="polite">
          {notice && <p role={notice.kind === "error" ? "alert" : "status"} className={notice.kind === "error" ? "text-bad-fg" : "text-ok-fg"}>{notice.text}</p>}
        </div>
      </form>

      <section aria-label={t("fridge.scan")} className="space-y-3">
        <button type="button" className="btn-secondary" aria-expanded={scanning} onClick={() => setScanning((v) => !v)}>
          <Icon name="camera" className="me-2 h-5 w-5" />{scanning ? t("fridge.scan.close") : t("fridge.scan")}
        </button>
        {scanning && (
          <div className="space-y-6">
            <Scanner onCode={onScan} />
            <ManualEntry onCode={onScan} />
          </div>
        )}
      </section>

      <section aria-labelledby="fridge-list" className="space-y-3">
        <h2 id="fridge-list" className="text-lg font-semibold">{t("fridge.list")}</h2>
        {items.length === 0 ? (
          <p>{t("fridge.empty")}</p>
        ) : (
          <>
            <p className="text-sm text-muted" aria-live="polite">
              {t("fridge.selected", { n: selected.size, max: MAX_INGREDIENTS })} — {t("fridge.max", { max: MAX_INGREDIENTS })}
            </p>
            <ul className="space-y-2">
              {items.map((i) => {
                const blocked = blockedIds.has(i.id);
                const checked = selected.has(i.id);
                return (
                  <li key={i.id} className="flex items-start gap-2 rounded-xl bg-surface p-2 shadow-sm">
                    <label className={`flex min-h-12 min-w-0 flex-1 items-start gap-3 p-1 ${blocked ? "opacity-70" : "cursor-pointer"}`}>
                      <input
                        type="checkbox"
                        checked={checked}
                        disabled={blocked || (!checked && atMax)}
                        onChange={() => toggle(i.id)}
                        aria-label={t("fridge.select", { name: i.name })}
                        className="mt-1 h-6 w-6 shrink-0 accent-primary"
                      />
                      <span className="min-w-0">
                        <span className="block font-medium">{i.name}</span>
                        {blocked && <span className="block text-sm text-warn-fg"><Icon name="alert" className="me-1 h-4 w-4 align-[-0.15em]" />{t("fridge.incompatible")}</span>}
                      </span>
                    </label>
                    <button
                      type="button"
                      onClick={() => removeFridgeItem(i.id)}
                      aria-label={t("fridge.remove", { name: i.name })}
                      title={t("fridge.remove", { name: i.name })}
                      className="inline-flex min-h-10 min-w-10 shrink-0 items-center justify-center rounded-full border-2 border-line-strong "
                    >
                      <Icon name="x" className="h-5 w-5" />
                    </button>
                  </li>
                );
              })}
            </ul>
            <button type="button" className="btn-primary disabled:cursor-not-allowed disabled:opacity-50" disabled={selected.size === 0} onClick={generate}>
              <Icon name="utensils" className="me-2 h-5 w-5" />{t("fridge.generate")}
            </button>
          </>
        )}
        {!persisted && <p className="text-sm text-muted">{t("fridge.session")}</p>}
        <p className="text-sm text-muted">{t("fridge.privacy")}</p>
      </section>

      {gen && <RecipeGenerator key={gen.key} source={gen.source} onClose={() => setGen(null)} />}
    </div>
  );
}
