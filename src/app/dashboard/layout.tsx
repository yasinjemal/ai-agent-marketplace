// =============================================================
// Dashboard Layout — Sidebar navigation + content area
// Provides consistent nav for all /dashboard/* pages.
// =============================================================

"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useUser } from "@clerk/nextjs";
import {
  Bot,
  CreditCard,
  Gift,
  Key,
  LayoutDashboard,
  Menu,
  Settings,
  X,
  Zap,
} from "lucide-react";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Separator } from "@/components/ui/separator";

interface NavItem {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  show: boolean;
}

function useDashboardRole() {
  const { user } = useUser();
  const metadata = user?.publicMetadata as Record<string, unknown> | undefined;
  const clerkRole = metadata?.role as string | undefined;
  const clerkOnboarded = metadata?.onboardingComplete === true;

  // Fallback: read cookies (bridges Clerk JWT propagation delay)
  const [cookieRole, setCookieRole] = useState<string | undefined>();
  const [cookieOnboarded, setCookieOnboarded] = useState(false);

  useEffect(() => {
    const cookies = document.cookie.split("; ");
    const roleCookie = cookies
      .find((c) => c.startsWith("onboarding_role="))
      ?.split("=")[1];
    const onboardedCookie = cookies.some(
      (c) => c === "onboarding_complete=1",
    );
    setCookieRole(roleCookie);
    setCookieOnboarded(onboardedCookie);
  }, []);

  return {
    role: clerkRole ?? cookieRole,
    onboardingComplete: clerkOnboarded || cookieOnboarded,
  };
}

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { role, onboardingComplete } = useDashboardRole();

  const isDev = role === "DEVELOPER" || role === "ADMIN";

  const navItems: NavItem[] = [
    {
      href: "/dashboard",
      label: "Overview",
      icon: LayoutDashboard,
      show: true,
    },
    {
      href: "/dashboard/agents",
      label: "My Agents",
      icon: Bot,
      show: isDev,
    },
    {
      href: "/dashboard/api-keys",
      label: "API Keys",
      icon: Key,
      show: isDev,
    },
    {
      href: "/dashboard/executions",
      label: "Executions",
      icon: Zap,
      show: true,
    },
    {
      href: "/dashboard/billing",
      label: "Billing",
      icon: CreditCard,
      show: true,
    },
    {
      href: "/dashboard/referrals",
      label: "Referrals",
      icon: Gift,
      show: true,
    },
    {
      href: "/dashboard/settings",
      label: "Settings",
      icon: Settings,
      show: true,
    },
  ];

  const visibleNav = navItems.filter((item) => item.show);

  const isActive = (href: string) =>
    href === "/dashboard"
      ? pathname === "/dashboard"
      : pathname.startsWith(href);

  // Close sidebar on route change (mobile)
  useEffect(() => {
    setSidebarOpen(false);
  }, [pathname]);

  return (
    <div className="-mx-4 -my-6 flex min-h-[calc(100dvh-3.5rem-3rem)] gap-0 sm:-mx-6">
      {/* Mobile sidebar toggle */}
      <Button
        variant="ghost"
        size="icon"
        className="fixed bottom-4 right-4 z-50 rounded-full shadow-lg md:hidden"
        onClick={() => setSidebarOpen(!sidebarOpen)}
      >
        {sidebarOpen ? (
          <X className="h-5 w-5" />
        ) : (
          <Menu className="h-5 w-5" />
        )}
      </Button>

      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-background/80 backdrop-blur-sm md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          "fixed top-14 bottom-0 z-40 flex w-64 flex-col border-r bg-background transition-transform duration-200 md:sticky md:translate-x-0",
          sidebarOpen ? "translate-x-0" : "-translate-x-full",
        )}
      >
        <div className="flex items-center gap-2 px-4 py-4">
          <LayoutDashboard className="h-5 w-5 text-primary" />
          <span className="font-semibold">Dashboard</span>
        </div>
        <Separator />
        <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-3">
          {visibleNav.map(({ href, label, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                isActive(href)
                  ? "bg-primary/10 text-primary"
                  : "text-muted-foreground hover:bg-accent hover:text-accent-foreground",
              )}
            >
              <Icon className="h-4 w-4 shrink-0" />
              {label}
            </Link>
          ))}
        </nav>
        <Separator />
        <div className="px-4 py-3">
          <p className="text-xs text-muted-foreground">
            {role === "DEVELOPER"
              ? "Developer Account"
              : role === "ADMIN"
                ? "Admin Account"
                : "Business Account"}
          </p>
        </div>
      </aside>

      {/* Main content area */}
      <main className="flex-1 overflow-y-auto px-4 py-6 md:px-8">
        {children}
      </main>
    </div>
  );
}
