"use client";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { t } from "@/i18n";
import { isValidGtin } from "@/lib/barcode";
import { fetchProduct, type FetchOutcome } from "@/lib/client";
import { ResultScreen } from "@/components/ResultScreen";
import { StateMessage } from "@/components/StateMessage";

export default function ProductPage() {
  const params = useParams<{ code: string }>();
  const code = typeof params.code === "string" ? params.code : "";
  const [outcome, setOutcome] = useState<FetchOutcome | "loading">("loading");

  const load = useCallback(() => {
    if (!isValidGtin(code)) {
      setOutcome({ kind: "not_found" });
      return;
    }
    setOutcome("loading");
    fetchProduct(code).then(setOutcome);
  }, [code]);

  useEffect(load, [load]);

  if (outcome === "loading") return <p role="status" className="py-10 text-center text-lg">{t("result.loading")}</p>;
  if (outcome.kind !== "ok") return <StateMessage kind={outcome.kind} onRetry={load} />;
  return <ResultScreen product={outcome.product} source="barcode" />;
}
