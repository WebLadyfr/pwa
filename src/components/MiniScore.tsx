import { t } from "@/i18n";
import { Icon, type IconName } from "./Icon";
import type { Level } from "@/lib/score/types";

const STYLE: Record<Level, { box: string; icon: IconName }> = {
  green: { box: "bg-ok-bg text-ok-fg border-ok-ring", icon: "check" },
  orange: { box: "bg-warn-bg text-warn-fg border-warn-ring", icon: "alert" },
  red: { box: "bg-bad-bg text-bad-fg border-bad-ring", icon: "x-circle" },
};

/** Mini-score : icône + nombre + libellé lecteur d'écran (jamais la couleur seule). */
export function MiniScore({ score, level }: { score: number | null; level: Level | null }) {
  if (score === null || level === null) {
    return <span className="shrink-0 rounded-lg border-2 border-line-strong px-2 py-1 text-sm text-muted">{t("favorites.insufficient")}</span>;
  }
  const s = STYLE[level];
  return (
    <span className={`shrink-0 rounded-lg border-2 px-2 py-1 font-bold tabular-nums ${s.box}`}>
      <Icon name={s.icon} className="me-1 h-4 w-4 align-[-0.15em]" />
      {score}
      <span className="sr-only"> {t("result.outOf")} : {t(`level.${level}`)}</span>
    </span>
  );
}
