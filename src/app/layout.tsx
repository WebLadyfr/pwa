import type { Metadata, Viewport } from "next";
import { headers } from "next/headers";
import { Fredoka } from "next/font/google";
import "./globals.css";
import { RTL_LOCALES, defaultLocale, t } from "@/i18n";
import { AppGate } from "@/components/AppGate";
import { Footer } from "@/components/Footer";
import { SwRegister } from "@/components/SwRegister";
import { MonitoringInit } from "@/components/MonitoringInit";
import { PressFeedback } from "@/components/PressFeedback";

const display = Fredoka({ subsets: ["latin"], weight: ["600", "700"], variable: "--font-display", display: "swap" });

export const metadata: Metadata = {
  title: t("app.name"),
  description: t("app.tagline"),
  manifest: "/manifest.webmanifest",
  icons: { icon: "/favicon.svg", apple: "/icons/apple-touch-icon.png" },
  appleWebApp: { capable: true, title: t("app.name"), statusBarStyle: "default" },
  robots: { index: true, follow: true },
};

// Deux couleurs de barre système selon le thème de l'appareil.
export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#cad158" },
    { media: "(prefers-color-scheme: dark)", color: "#cad158" },
  ],
  width: "device-width",
  initialScale: 1,
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  // Lire les headers rend le rendu dynamique et donne accès au nonce de la CSP (posé par le middleware).
  const nonce = (await headers()).get("x-nonce") ?? undefined;
  return (
    // suppressHydrationWarning : theme-init.js ajuste data-theme / data-text AVANT l'hydratation (pas de flash).
    <html lang={defaultLocale} dir={RTL_LOCALES.includes(defaultLocale) ? "rtl" : "ltr"} data-theme="auto" data-text="normal" className={display.variable} suppressHydrationWarning>
      <head>
        {/* Script EXTERNE bloquant + nonce : compatible avec la CSP stricte (aucun script inline). */}
        <script src="/theme-init.js" nonce={nonce} suppressHydrationWarning />
      </head>
      <body className="min-h-screen">
        <a href="#main" suppressHydrationWarning className="sr-only focus:not-sr-only focus:absolute focus:start-2 focus:top-2 focus:bg-surface focus:p-3">
          {t("a11y.skip")}
        </a>
        <header className="bg-header">
          <div className="mx-auto flex max-w-xl items-center gap-3 px-4 py-2.5">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logo-horizontal.svg" alt={t("app.name")} width={1504} height={512} className="h-16 w-auto shrink-0" />
          </div>
        </header>
        <div className="mx-auto flex min-h-screen max-w-xl flex-col px-4 pb-28">
          <AppGate>{children}</AppGate>
          <Footer />
        </div>
        <SwRegister />
        <MonitoringInit />
        <PressFeedback />
      </body>
    </html>
  );
}
