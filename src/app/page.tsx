"use client";
import { useRouter } from "next/navigation";
import { useCallback } from "react";
import { Scanner } from "@/components/Scanner";
import { ManualEntry } from "@/components/ManualEntry";
import { t } from "@/i18n";

export default function HomePage() {
  const router = useRouter();
  const go = useCallback((code: string) => router.push(`/product/${encodeURIComponent(code)}`), [router]);

  return (
    <div className="space-y-8">
      <p className="text-lg text-muted">{t("app.tagline")}</p>
      <Scanner onCode={go} />
      <ManualEntry onCode={go} />
    </div>
  );
}
