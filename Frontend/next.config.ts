import type { NextConfig } from "next";

/**
 * API origin the browser is allowed to talk to. Derived from the same env var
 * the app uses at runtime so the CSP can never drift from the real endpoint.
 */
const API_ORIGIN = (() => {
  try {
    return new URL(process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api").origin;
  } catch {
    return "http://localhost:5000";
  }
})();

const isDev = process.env.NODE_ENV !== "production";

/**
 * Content-Security-Policy for the admin console.
 *
 * This app holds the most privileged sessions on the platform and keeps its
 * token in localStorage, so a script injection here is an administrative
 * compromise. This is the tightest policy the dependency set allows.
 *
 * 'unsafe-eval' is needed by the Next.js dev overlay and by ApexCharts'
 * runtime formatter compilation; it is dropped in production builds.
 * 'unsafe-inline' for styles is required by styled-jsx, ApexCharts and
 * flatpickr, which all inject <style> at runtime.
 */
const csp = [
  `default-src 'self'`,
  `script-src 'self'${isDev ? " 'unsafe-eval' 'unsafe-inline'" : ""}`,
  `style-src 'self' 'unsafe-inline'`,
  `img-src 'self' data: blob: ${API_ORIGIN}`,
  `font-src 'self' data:`,
  `connect-src 'self' ${API_ORIGIN}${isDev ? " ws: wss:" : ""}`,
  `frame-ancestors 'none'`,
  `base-uri 'self'`,
  `form-action 'self'`,
  `object-src 'none'`,
  ...(isDev ? [] : ["upgrade-insecure-requests"]),
].join("; ");

const securityHeaders = [
  { key: "Content-Security-Policy", value: csp },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(), interest-cohort=()",
  },
  { key: "X-DNS-Prefetch-Control", value: "off" },
  // Ignored over plain HTTP, so it is safe to send in development too.
  {
    key: "Strict-Transport-Security",
    value: "max-age=63072000; includeSubDomains; preload",
  },
  // The admin console must never be indexed.
  { key: "X-Robots-Tag", value: "noindex, nofollow" },
];

const nextConfig: NextConfig = {
  // Do not advertise the framework version.
  poweredByHeader: false,
  // Client source maps would publish readable admin source, including every
  // internal API path, to anyone opening devtools.
  productionBrowserSourceMaps: false,

  webpack(config) {
    config.module.rules.push({
      test: /\.svg$/,
      use: ["@svgr/webpack"],
    });
    return config;
  },

  turbopack: {
    rules: {
      "*.svg": {
        loaders: ["@svgr/webpack"],
        as: "*.js",
      },
    },
  },

  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
};

export default nextConfig;
