import { t } from "@/i18n";
import { Icon, type IconName } from "./Icon";
import type { Level } from "@/lib/score/types";

/** Le niveau est communiqué par couleur + icône + texte (jamais par la couleur seule). */
const STYLE: Record<Level, { box: string; icon: IconName; sym: string }> = {
  green: { box: "bg-ok-bg text-ok-fg border-ok-ring", icon: "check", sym: "green" },
  orange: { box: "bg-warn-bg text-warn-fg border-warn-ring", icon: "alert", sym: "orange" },
  red: { box: "bg-bad-bg text-bad-fg border-bad-ring", icon: "x-circle", sym: "red" },
};

export function ScoreBadge({ score, level }: { score: number; level: Level }) {
  const s = STYLE[level];
  return (
    <div
      role="img"
      aria-label={`${t("result.score")} ${score} ${t("result.outOf")} : ${t(`level.${level}`)}`}
      className={`flex items-center gap-4 rounded-2xl border-2 p-5 ${s.box}`}
    >
      <div aria-hidden="true"><Icon name={s.icon} className="h-12 w-12" /></div>
      <div aria-hidden="true">
        <div className="text-6xl font-bold leading-none tabular-nums">
          {score}
          <span className="ms-1 text-xl font-medium">/100</span>
        </div>
        <div className="mt-1 text-lg font-semibold">{t(`level.${level}`)}</div>
      </div>
    </div>
  );
}
