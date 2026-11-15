export interface BarItem { key: string; label: string; /** Libellé complet pour le texte alternatif. */ long?: string; value: number }

/**
 * Histogramme vertical de comptes (scans, recettes, jours suivis). La valeur est écrite au-dessus de chaque barre,
 * un total zéro reste visible (trait en pointillés). Le texte alternatif résume toutes les valeurs.
 */
export function BarChart({ label, items, unit }: { label: string; items: BarItem[]; unit: string }) {
  const max = Math.max(1, ...items.map((i) => i.value));
  const summary = items.map((i) => `${i.long ?? i.label} : ${i.value}`).join(", ");
  return (
    <div role="img" aria-label={`${label} (${unit}) — ${summary}`} className="space-y-1">
      <div className="flex h-28 items-end gap-1.5" aria-hidden="true">
        {items.map((i) => (
          <div key={i.key} className="flex h-full min-w-0 flex-1 flex-col items-center justify-end gap-1">
            <span className="text-xs font-semibold tabular-nums">{i.value > 0 ? i.value : ""}</span>
            {i.value === 0 ? (
              <div className="h-1.5 w-full rounded-full border border-dashed border-line-strong" />
            ) : (
              <div className="w-full rounded-t-md bg-primary" style={{ height: `${Math.max(6, (i.value / max) * 100)}%` }} />
            )}
          </div>
        ))}
      </div>
      <div className="flex gap-1.5 text-center text-xs text-muted" aria-hidden="true">
        {items.map((i) => <span key={i.key} className="min-w-0 flex-1 truncate">{i.label}</span>)}
      </div>
    </div>
  );
}
