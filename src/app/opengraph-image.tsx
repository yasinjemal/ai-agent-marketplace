// =============================================================
// Open Graph Image — Dynamic OG image generation
// Used for social sharing previews across the platform
// =============================================================

import { ImageResponse } from "next/og";

export const runtime = "edge";
export const alt = "AI Agent Marketplace — South Africa";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function OGImage() {
  return new ImageResponse(
    (
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          width: "100%",
          height: "100%",
          background: "linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #0f172a 100%)",
          color: "white",
          fontFamily: "sans-serif",
        }}
      >
        {/* Logo */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            width: 80,
            height: 80,
            borderRadius: 20,
            background: "rgba(99, 102, 241, 0.2)",
            marginBottom: 24,
          }}
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="#818cf8"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            width="44"
            height="44"
          >
            <path d="M12 8V4H8" />
            <rect width="16" height="12" x="4" y="8" rx="2" />
            <path d="M2 14h2" />
            <path d="M20 14h2" />
            <path d="M15 13v2" />
            <path d="M9 13v2" />
          </svg>
        </div>

        {/* Title */}
        <div
          style={{
            fontSize: 48,
            fontWeight: 700,
            letterSpacing: "-0.025em",
            textAlign: "center",
            marginBottom: 12,
          }}
        >
          AI Agent Marketplace
        </div>

        {/* Subtitle */}
        <div
          style={{
            fontSize: 24,
            color: "#94a3b8",
            textAlign: "center",
            maxWidth: 700,
          }}
        >
          AI automation built for South African SMEs
        </div>

        {/* Features bar */}
        <div
          style={{
            display: "flex",
            gap: 32,
            marginTop: 40,
            fontSize: 16,
            color: "#64748b",
          }}
        >
          <span>🤖 Ready-to-use Agents</span>
          <span>🇿🇦 ZAR Pricing</span>
          <span>🛡️ POPIA Compliant</span>
          <span>⚡ No-Code Setup</span>
        </div>
      </div>
    ),
    { ...size },
  );
}
