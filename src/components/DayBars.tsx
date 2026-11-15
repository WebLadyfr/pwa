export interface DayBar { key: string; short: string; long: string; avg: number | null }

/** Histogramme vertical (7 jours, score moyen de 1 à 5). La valeur est écrite au-dessus de chaque barre. */
export function DayBars({ label, days, valueText }: { label: string; days: DayBar[]; valueText: (d: DayBar) => string }) {
  return (
    <div role="img" aria-label={`${label} : ${days.map(valueText).join(", ")}`} className="space-y-1">
      <div className="flex h-24 items-end gap-2" aria-hidden="true">
        {days.map((d) => (
          <div key={d.key} className="flex h-full flex-1 flex-col items-center justify-end gap-1">
            <span className="text-xs font-semibold tabular-nums">{d.avg === null ? "" : d.avg.toFixed(1).replace(".0", "")}</span>
            {d.avg === null ? (
              <div className="h-1.5 w-full rounded-full border border-dashed border-line-strong" />
            ) : (
              <div className="w-full rounded-t-md bg-primary" style={{ height: `${(d.avg / 5) * 100}%` }} />
            )}
          </div>
        ))}
      </div>
      <div className="flex gap-2 text-center text-xs text-muted" aria-hidden="true">
        {days.map((d) => <span key={d.key} className="flex-1">{d.short}</span>)}
      </div>
    </div>
  );
}
