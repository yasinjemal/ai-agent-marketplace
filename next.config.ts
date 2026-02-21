import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // -------------------------------------------------------
  // Performance
  // -------------------------------------------------------

  // Compress responses with gzip
  compress: true,

  // -------------------------------------------------------
  // Security Headers
  // -------------------------------------------------------
  headers: async () => [
    {
      // Apply security headers to all routes
      source: "/(.*)",
      headers: [
        {
          key: "X-DNS-Prefetch-Control",
          value: "on",
        },
        {
          key: "Strict-Transport-Security",
          value: "max-age=63072000; includeSubDomains; preload",
        },
        {
          key: "X-Content-Type-Options",
          value: "nosniff",
        },
        {
          key: "X-Frame-Options",
          value: "SAMEORIGIN",
        },
        {
          key: "X-XSS-Protection",
          value: "1; mode=block",
        },
        {
          key: "Referrer-Policy",
          value: "strict-origin-when-cross-origin",
        },
        {
          key: "Permissions-Policy",
          value: "camera=(), microphone=(), geolocation=()",
        },
      ],
    },
    {
      // Cache static assets aggressively
      source: "/(.*)\\.(ico|png|jpg|jpeg|gif|svg|woff2?|ttf|css|js)$",
      headers: [
        {
          key: "Cache-Control",
          value: "public, max-age=31536000, immutable",
        },
      ],
    },
  ],

  // -------------------------------------------------------
  // Powered-by header removal (security)
  // -------------------------------------------------------
  poweredByHeader: false,
};

export default nextConfig;
