export interface Segment { id: string; label: string; value: number; className: string }

/**
 * Barre empilée horizontale : le total ET la répartition en un coup d'œil. La légende écrit chaque valeur
 * (le sens n'est jamais porté par la couleur seule).
 */
export function StackedBar({ label, segments, emptyText }: { label: string; segments: Segment[]; emptyText: string }) {
  const total = segments.reduce((s, x) => s + x.value, 0);
  const summary = segments.map((s) => `${s.label} : ${s.value}`).join(", ");
  return (
    <div className="space-y-2">
      <div className="flex items-baseline justify-between gap-3">
        <span className="font-medium">{label}</span>
        <span className="shrink-0 text-sm font-semibold tabular-nums">{total}</span>
      </div>
      {total === 0 ? (
        <p className="text-sm text-muted">{emptyText}</p>
      ) : (
        <>
          <div role="img" aria-label={`${label} : ${summary}`} className="flex h-3 w-full gap-0.5 overflow-hidden rounded-full bg-primary-soft">
            {segments.filter((s) => s.value > 0).map((s) => (
              <div key={s.id} className={`h-full ${s.className}`} style={{ width: `${(s.value / total) * 100}%` }} />
            ))}
          </div>
          <ul className="flex flex-wrap gap-x-4 gap-y-1 text-sm">
            {segments.map((s) => (
              <li key={s.id} className="flex items-center gap-1.5">
                <span aria-hidden="true" className={`h-2.5 w-2.5 rounded-full ${s.className}`} />
                {s.label} <span className="font-semibold tabular-nums">{s.value}</span>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}
