import { t } from "@/i18n";
import type { Level } from "@/lib/score/types";

const STYLE: Record<Level, { box: string; icon: string }> = {
  green: { box: "bg-ok-bg text-ok-fg border-ok-ring", icon: "✔" },
  orange: { box: "bg-warn-bg text-warn-fg border-warn-ring", icon: "▲" },
  red: { box: "bg-bad-bg text-bad-fg border-bad-ring", icon: "✖" },
};

/** Mini-score : icône + nombre + libellé lecteur d'écran (jamais la couleur seule). */
export function MiniScore({ score, level }: { score: number | null; level: Level | null }) {
  if (score === null || level === null) {
    return <span className="shrink-0 rounded-lg border-2 border-line-strong px-2 py-1 text-sm text-muted">{t("favorites.insufficient")}</span>;
  }
  const s = STYLE[level];
  return (
    <span className={`shrink-0 rounded-lg border-2 px-2 py-1 font-bold tabular-nums ${s.box}`}>
      <span aria-hidden="true">{s.icon} </span>
      {score}
      <span className="sr-only"> {t("result.outOf")} : {t(`level.${level}`)}</span>
    </span>
  );
}
