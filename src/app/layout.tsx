import type { Metadata, Viewport } from "next";
import { headers } from "next/headers";
import "./globals.css";
import { RTL_LOCALES, defaultLocale, t } from "@/i18n";
import { AppGate } from "@/components/AppGate";
import { Footer } from "@/components/Footer";
import { SwRegister } from "@/components/SwRegister";
import { MonitoringInit } from "@/components/MonitoringInit";

export const metadata: Metadata = {
  title: t("app.name"),
  description: t("app.tagline"),
  manifest: "/manifest.webmanifest",
  icons: { icon: "/icons/icon-192.png", apple: "/icons/icon-192.png" },
  appleWebApp: { capable: true, title: t("app.name"), statusBarStyle: "default" },
  robots: { index: true, follow: true },
};

// Deux couleurs de barre système selon le thème de l'appareil.
export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#255a54" },
    { media: "(prefers-color-scheme: dark)", color: "#0f1a19" },
  ],
  width: "device-width",
  initialScale: 1,
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  // Lire les headers rend le rendu dynamique et donne accès au nonce de la CSP (posé par le middleware).
  const nonce = (await headers()).get("x-nonce") ?? undefined;
  return (
    // suppressHydrationWarning : theme-init.js ajuste data-theme / data-text AVANT l'hydratation (pas de flash).
    <html lang={defaultLocale} dir={RTL_LOCALES.includes(defaultLocale) ? "rtl" : "ltr"} data-theme="auto" data-text="normal" suppressHydrationWarning>
      <head>
        {/* Script EXTERNE bloquant + nonce : compatible avec la CSP stricte (aucun script inline). */}
        <script src="/theme-init.js" nonce={nonce} suppressHydrationWarning />
      </head>
      <body className="min-h-screen">
        <a href="#main" className="sr-only focus:not-sr-only focus:absolute focus:left-2 focus:top-2 focus:bg-surface focus:p-3">
          {t("a11y.skip")}
        </a>
        <div className="mx-auto flex min-h-screen max-w-xl flex-col px-4">
          <header className="py-4 text-2xl font-bold text-primary">{t("app.name")}</header>
          <AppGate>{children}</AppGate>
          <Footer />
        </div>
        <SwRegister />
        <MonitoringInit />
      </body>
    </html>
  );
}
