// =============================================================
// Site Header — Navigation bar with Clerk auth + role-based links
// =============================================================

"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  SignInButton,
  SignUpButton,
  UserButton,
  useUser,
} from "@clerk/nextjs";
import { Bot, BarChart3, CreditCard, Gift, Key, LayoutDashboard, Settings, Shield, Store, Tag, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function Header() {
  const pathname = usePathname();
  const { isSignedIn, user, isLoaded } = useUser();

  // Get role from Clerk public metadata
  const metadata = user?.publicMetadata as Record<string, unknown> | undefined;
  const role = metadata?.role as string | undefined;
  const onboardingComplete = metadata?.onboardingComplete === true;

  // Build nav links based on role
  const navLinks = [
    { href: "/agents", label: "Marketplace", icon: Store, show: true },
    { href: "/pricing", label: "Pricing", icon: Tag, show: true },
    {
      href: "/dashboard/agents",
      label: "Developer",
      icon: LayoutDashboard,
      show: onboardingComplete && (role === "DEVELOPER" || role === "ADMIN"),
    },
    {
      href: "/dashboard/api-keys",
      label: "API Keys",
      icon: Key,
      show: onboardingComplete && (role === "DEVELOPER" || role === "ADMIN"),
    },
    {
      href: "/dashboard/billing",
      label: "Billing",
      icon: CreditCard,
      show: onboardingComplete && isSignedIn,
    },
    {
      href: "/dashboard/executions",
      label: "Executions",
      icon: Zap,
      show: onboardingComplete && isSignedIn,
    },
    {
      href: "/dashboard/referrals",
      label: "Referrals",
      icon: Gift,
      show: onboardingComplete && isSignedIn,
    },
    {
      href: "/admin/agents",
      label: "Admin",
      icon: Shield,
      show: onboardingComplete && role === "ADMIN",
    },
    {
      href: "/admin/analytics",
      label: "Analytics",
      icon: BarChart3,
      show: onboardingComplete && role === "ADMIN",
    },
    {
      href: "/dashboard/settings",
      label: "Settings",
      icon: Settings,
      show: onboardingComplete && isSignedIn,
    },
  ];

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="mx-auto flex h-14 max-w-7xl items-center px-4 sm:px-6">
        {/* Logo */}
        <Link href="/" className="mr-6 flex items-center gap-2 font-bold">
          <Bot className="h-6 w-6 text-primary" />
          <span className="hidden sm:inline-block">AI Agent Marketplace</span>
        </Link>

        {/* Nav Links */}
        <nav className="flex flex-1 items-center gap-1">
          {navLinks
            .filter((link) => link.show)
            .map(({ href, label, icon: Icon }) => (
              <Button
                key={href}
                variant="ghost"
                size="sm"
                asChild
                className={cn(
                  "gap-1.5",
                  pathname.startsWith(href) &&
                    "bg-accent text-accent-foreground",
                )}
              >
                <Link href={href}>
                  <Icon className="h-4 w-4" />
                  <span className="hidden sm:inline-block">{label}</span>
                </Link>
              </Button>
            ))}
        </nav>

        {/* Auth Controls */}
        <div className="flex items-center gap-2">
          {!isLoaded ? (
            <div className="h-8 w-8 animate-pulse rounded-full bg-muted" />
          ) : isSignedIn ? (
            <UserButton
              signInUrl="/sign-in"
              appearance={{
                elements: {
                  avatarBox: "h-8 w-8",
                },
              }}
            />
          ) : (
            <>
              <SignInButton mode="modal">
                <Button variant="ghost" size="sm">
                  Sign In
                </Button>
              </SignInButton>
              <SignUpButton mode="modal">
                <Button size="sm">Get Started</Button>
              </SignUpButton>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
