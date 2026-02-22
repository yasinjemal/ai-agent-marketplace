import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { ClerkProvider } from "@clerk/nextjs";
import { Toaster } from "@/components/ui/sonner";
import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";
import { ThemeProvider } from "@/components/theme-provider";
import { WebSiteJsonLd, OrganizationJsonLd } from "@/components/seo/json-ld";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "https://ai-agents.co.za";

export const metadata: Metadata = {
  title: {
    default: "AI Agent Marketplace — South Africa",
    template: "%s | AI Agent Marketplace SA",
  },
  description:
    "Discover and deploy AI agents built for South African SMEs. Customer support, invoicing, scheduling, and more.",
  metadataBase: new URL(APP_URL),
  keywords: [
    "AI agents",
    "South Africa",
    "SME automation",
    "business AI",
    "customer support bot",
    "POPIA compliant",
    "ZAR",
    "marketplace",
  ],
  authors: [{ name: "AI Agent Marketplace SA" }],
  creator: "AI Agent Marketplace SA",
  openGraph: {
    type: "website",
    locale: "en_ZA",
    url: APP_URL,
    siteName: "AI Agent Marketplace SA",
    title: "AI Agent Marketplace — South Africa",
    description:
      "AI automation built for South African SMEs. Ready-to-use agents with ZAR pricing and POPIA compliance.",
  },
  twitter: {
    card: "summary_large_image",
    title: "AI Agent Marketplace — South Africa",
    description:
      "AI automation built for South African SMEs. Ready-to-use agents with ZAR pricing and POPIA compliance.",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true },
  },
  manifest: "/manifest.webmanifest",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <ClerkProvider
      signInFallbackRedirectUrl="/dashboard"
      signUpFallbackRedirectUrl="/onboarding"
      signInUrl="/sign-in"
      signUpUrl="/sign-up"
    >
      <html lang="en" suppressHydrationWarning>
        <body
          className={`${geistSans.variable} ${geistMono.variable} flex min-h-dvh flex-col antialiased`}
        >
          <ThemeProvider
            attribute="class"
            defaultTheme="system"
            enableSystem
            disableTransitionOnChange
          >
            <WebSiteJsonLd
              url={APP_URL}
              name="AI Agent Marketplace SA"
              description="AI automation built for South African SMEs"
            />
            <OrganizationJsonLd
              url={APP_URL}
              name="AI Agent Marketplace SA"
              description="Discover and deploy AI agents built for South African SMEs."
            />
            <Header />
            <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-6 sm:px-6">{children}</main>
            <Footer />
            <Toaster richColors position="top-right" />
          </ThemeProvider>
        </body>
      </html>
    </ClerkProvider>
  );
}
