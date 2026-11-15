/**
 * Barre de progression accessible : role="progressbar" + valeur écrite (« 3 / 5 »). Jamais la couleur seule.
 */
export function ProgressBar({ label, value, goal, hint }: { label: string; value: number; goal: number; hint?: string }) {
  const safeGoal = Math.max(1, goal);
  const shown = Math.min(Math.max(0, value), safeGoal);
  const pct = Math.round((shown / safeGoal) * 100);
  return (
    <div className="space-y-1">
      <div className="flex items-baseline justify-between gap-3">
        <span className="font-medium">{label}</span>
        <span className="shrink-0 font-semibold tabular-nums">{value} / {goal}</span>
      </div>
      <div
        role="progressbar"
        aria-label={label}
        aria-valuemin={0}
        aria-valuemax={safeGoal}
        aria-valuenow={shown}
        aria-valuetext={`${value} sur ${goal}`}
        className="h-3 w-full overflow-hidden rounded-full bg-primary-soft"
      >
        <div className="h-full rounded-full bg-primary transition-[width] duration-500" style={{ width: `${pct}%` }} />
      </div>
      {hint && <p className="text-sm text-muted">{hint}</p>}
    </div>
  );
}
