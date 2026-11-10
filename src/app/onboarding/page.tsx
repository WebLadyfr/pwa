"use client";
import { useRouter } from "next/navigation";
import { Onboarding } from "@/components/Onboarding";

/** Refaire l'onboarding / modifier le profil (accessible depuis les Réglages). */
export default function OnboardingPage() {
  const router = useRouter();
  return <Onboarding onDone={() => router.push("/settings")} />;
}
