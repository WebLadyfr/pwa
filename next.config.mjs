import path from "node:path";

/** @type {import('next').NextConfig} */

// En-têtes de sécurité STATIQUES (la CSP, qui dépend d'un nonce par requête, est dans src/middleware.ts).
const securityHeaders = [
  // HTTPS forcé 2 ans (preload : ne soumettre à hstspreload.org qu'une fois le domaine définitif).
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  // Caméra autorisée pour notre origine uniquement ; tout le reste est désactivé.
  {
    key: "Permissions-Policy",
    value: "camera=(self), microphone=(), geolocation=(), payment=(), usb=(), bluetooth=(), accelerometer=(), gyroscope=(), magnetometer=(), interest-cohort=()",
  },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
  { key: "Cross-Origin-Resource-Policy", value: "same-origin" },
  { key: "X-DNS-Prefetch-Control", value: "off" },
];

const nextConfig = {
  poweredByHeader: false, // ne pas annoncer la techno
  reactStrictMode: true,
  webpack(config) {
    // Alias explicites (en plus de tsconfig paths) pour une résolution identique partout.
    config.resolve.alias = {
      ...config.resolve.alias,
      "@": path.resolve(process.cwd(), "src"),
      "@rules": path.resolve(process.cwd(), "rules"),
    };
    return config;
  },
  async headers() {
    return [
      { source: "/:path*", headers: securityHeaders },
      // Le service worker doit toujours être revalidé et ne peut pas être détourné.
      {
        source: "/sw.js",
        headers: [
          { key: "Cache-Control", value: "no-cache, no-store, must-revalidate" },
          { key: "Content-Type", value: "text/javascript; charset=utf-8" },
          { key: "Content-Security-Policy", value: "default-src 'none'; script-src 'self'" },
        ],
      },
      // Page hors-ligne statique (pas de middleware) : CSP minimale dédiée, sans script.
      {
        source: "/offline.html",
        headers: [{ key: "Content-Security-Policy", value: "default-src 'none'; style-src 'unsafe-inline'; base-uri 'none'; form-action 'none'" }],
      },
    ];
  },
};

export default nextConfig;
