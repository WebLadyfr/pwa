import { t } from "@/i18n";
import type { GiLevel } from "@/lib/glycemic";
import { Icon } from "./Icon";

const STYLE: Record<GiLevel, { box: string; icon: "check" | "alert" | "x-circle" }> = {
  low: { box: "bg-ok-bg text-ok-fg border-ok-ring", icon: "check" },
  medium: { box: "bg-warn-bg text-warn-fg border-warn-ring", icon: "alert" },
  high: { box: "bg-bad-bg text-bad-fg border-bad-ring", icon: "x-circle" },
};

/** Pastille d'indice glycémique : icône + texte (jamais la couleur seule). */
export function GiBadge({ level, value }: { level: GiLevel; value?: number }) {
  const s = STYLE[level];
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full border-2 px-3 py-1 text-sm font-semibold ${s.box}`}>
      <Icon name={s.icon} className="h-4 w-4" />
      {t(`gi.${level}`)}
      {value !== undefined && <span className="font-normal">· {t("gi.value", { n: value })}</span>}
    </span>
  );
}
