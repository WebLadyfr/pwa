import type { Config } from "tailwindcss";

// Toutes les couleurs sont des jetons (variables CSS définies dans globals.css, clair + sombre).
// Le niveau du score est TOUJOURS porté par couleur + icône + texte, jamais par la couleur seule.
const v = (name: string) => `var(--${name})`;

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        canvas: v("canvas"),
        surface: v("surface"),
        ink: v("ink"),
        muted: v("muted"),
        line: { DEFAULT: v("line"), strong: v("line-strong") },
        primary: { DEFAULT: v("primary"), hover: v("primary-hover"), soft: v("primary-soft") },
        "on-primary": v("on-primary"),
        ok: { bg: v("ok-bg"), fg: v("ok-fg"), ring: v("ok-ring") },
        warn: { bg: v("warn-bg"), fg: v("warn-fg"), ring: v("warn-ring") },
        bad: { bg: v("bad-bg"), fg: v("bad-fg"), ring: v("bad-ring") },
      },
    },
  },
  plugins: [],
};
export default config;
