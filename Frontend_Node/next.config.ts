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

const IMAGE_HOSTS = [
  "https://images.unsplash.com",
  "https://cdn.pixabay.com",
  "https://lh3.googleusercontent.com",
];

const isDev = process.env.NODE_ENV !== "production";

/**
 * Content-Security-Policy.
 *
 * The app has no XSS sink today (no dangerouslySetInnerHTML anywhere, and
 * React escapes by default), but access and refresh tokens live in
 * localStorage, so any future script injection would mean full account
 * takeover. This is the control that limits that blast radius.
 *
 * 'unsafe-eval' is required by the Next.js dev overlay only and is dropped in
 * production builds. 'unsafe-inline' for styles is needed by styled-jsx and
 * Tailwind's runtime style injection.
 */
const csp = [
  `default-src 'self'`,
  `script-src 'self'${isDev ? " 'unsafe-eval' 'unsafe-inline'" : ""}`,
  `style-src 'self' 'unsafe-inline'`,
  `img-src 'self' data: blob: ${API_ORIGIN} ${IMAGE_HOSTS.join(" ")}`,
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
  // Clickjacking. frame-ancestors above covers modern browsers; this is the
  // legacy equivalent.
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
];

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // Do not advertise the framework version.
  poweredByHeader: false,
  // Client source maps would publish readable application source, including
  // internal API paths and business logic, to anyone opening devtools.
  productionBrowserSourceMaps: false,
  images: {
    unoptimized: true,
    remotePatterns: [
      {
        protocol: "https",
        hostname: "images.unsplash.com",
      },
      {
        protocol: "https",
        hostname: "cdn.pixabay.com",
      },
      {
        protocol: "https",
        hostname: "lh3.googleusercontent.com",
      },
    ],
  },
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
};

export default nextConfig;
