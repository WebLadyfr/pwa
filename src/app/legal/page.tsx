import { BackButton } from "@/components/BackButton";
import { LegalMenu } from "@/components/LegalMenu";
import { t } from "@/i18n";

export const metadata = { title: "Informations légales" };

export default function LegalIndex() {
  return (
    <div className="space-y-4">
      <BackButton fallback="/settings" />
      <h1 className="text-xl font-semibold">{t("settings.about")}</h1>
      <LegalMenu />
    </div>
  );
}
