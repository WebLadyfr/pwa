import type { Config } from "tailwindcss";

// Toutes les couleurs sont des jetons (variables CSS définies dans globals.css, clair + sombre).
// Le niveau du score est TOUJOURS porté par couleur + icône + texte, jamais par la couleur seule.
const v = (name: string) => `var(--${name})`;

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      fontFamily: { display: ["var(--font-display)", "ui-rounded", "system-ui", "sans-serif"] },
      colors: {
        canvas: v("canvas"),
        surface: v("surface"),
        ink: v("ink"),
        muted: v("muted"),
        line: { DEFAULT: v("line"), strong: v("line-strong") },
        primary: { DEFAULT: v("primary"), ink: v("primary-ink"), hover: v("primary-hover"), soft: v("primary-soft") },
        "on-primary": v("on-primary"),
        accent: v("accent"),
        brand: v("brand"),
        header: { DEFAULT: v("header-bg"), fg: v("header-fg") },
        footer: { DEFAULT: v("footer-bg"), fg: v("footer-fg") },
        ok: { bg: v("ok-bg"), fg: v("ok-fg"), ring: v("ok-ring") },
        warn: { bg: v("warn-bg"), fg: v("warn-fg"), ring: v("warn-ring") },
        bad: { bg: v("bad-bg"), fg: v("bad-fg"), ring: v("bad-ring") },
      },
    },
  },
  plugins: [],
};
export default config;
