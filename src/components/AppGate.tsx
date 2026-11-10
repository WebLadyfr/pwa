"use client";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { t } from "@/i18n";
import { CHANGE_EVENT, needsOnboarding } from "@/lib/storage";
import { Nav } from "./Nav";
import { Onboarding } from "./Onboarding";

/** Pages lisibles sans onboarding (textes légaux) ou qui gèrent leur propre parcours. */
const OPEN_PATHS = ["/privacy", "/terms", "/legal", "/onboarding"];

/**
 * Garde d'accès : tant que le disclaimer n'est pas accepté et qu'un choix de consentement
 * (pour la version actuelle des textes) n'est pas enregistré, on affiche l'onboarding à la place de l'app.
 * Si les textes changent (POLICY_VERSION / DISCLAIMER_VERSION), le parcours est redemandé.
 */
export function AppGate({ children }: { children: React.ReactNode }) {
  const path = usePathname();
  const [state, setState] = useState<"checking" | "need" | "ok">("checking");

  useEffect(() => {
    const check = () => setState(needsOnboarding() ? "need" : "ok");
    check();
    window.addEventListener(CHANGE_EVENT, check);
    return () => window.removeEventListener(CHANGE_EVENT, check);
  }, []);

  const open = OPEN_PATHS.some((p) => path === p || path.startsWith(`${p}/`));

  if (open) {
    return (
      <>
        {state === "ok" && <Nav />}
        <main id="main" className="flex-1 py-5">{children}</main>
      </>
    );
  }
  if (state === "checking") {
    return <main id="main" className="flex-1 py-5"><p role="status" className="sr-only">{t("a11y.loading")}</p></main>;
  }
  if (state === "need") {
    return (
      <main id="main" className="flex-1 py-5">
        <Onboarding onDone={() => setState(needsOnboarding() ? "need" : "ok")} />
      </main>
    );
  }
  return (
    <>
      <Nav />
      <main id="main" className="flex-1 py-5">{children}</main>
    </>
  );
}
