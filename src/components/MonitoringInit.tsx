"use client";
import { useEffect } from "react";
import { startMonitoring, stopMonitoring } from "@/lib/monitoring";
import { getPrefs } from "@/lib/prefs";
import { CHANGE_EVENT } from "@/lib/storage";

/** Démarre / arrête les rapports d'erreur selon l'opt-in des Réglages (désactivé par défaut). */
export function MonitoringInit() {
  useEffect(() => {
    const sync = () => {
      if (getPrefs().errorReports) void startMonitoring();
      else void stopMonitoring();
    };
    sync();
    window.addEventListener(CHANGE_EVENT, sync);
    return () => window.removeEventListener(CHANGE_EVENT, sync);
  }, []);
  return null;
}
