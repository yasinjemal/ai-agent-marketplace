// =============================================================
// /onboarding — New user onboarding page
// Creates Tenant + assigns role after first Clerk sign-up.
// =============================================================

"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useUser } from "@clerk/nextjs";
import { Building2, Code2, Loader2, ShoppingBag } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

type UserRole = "DEVELOPER" | "BUSINESS_USER";

const ROLES = [
  {
    id: "BUSINESS_USER" as UserRole,
    label: "Business User",
    description: "Subscribe to AI agents and deploy them for your SME.",
    icon: ShoppingBag,
  },
  {
    id: "DEVELOPER" as UserRole,
    label: "Developer",
    description: "Build and publish AI agents on the marketplace.",
    icon: Code2,
  },
] as const;

export default function OnboardingPage() {
  const { user } = useUser();
  const router = useRouter();
  const [businessName, setBusinessName] = useState("");
  const [selectedRole, setSelectedRole] = useState<UserRole | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Check if user already has onboarding metadata (handles stale JWT scenario).
  // If Clerk publicMetadata shows onboarded but the middleware doesn't know yet,
  // call the API to set the bridge cookies, then redirect to dashboard.
  useEffect(() => {
    const meta = user?.publicMetadata as Record<string, unknown> | undefined;
    if (meta?.onboardingComplete) {
      // Call the onboarding API to set bridge cookies (it detects existing user and sets them)
      const syncRole = meta.role === "DEVELOPER" ? "DEVELOPER" : "BUSINESS_USER";
      fetch("/api/onboarding", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          businessName: "sync",
          role: syncRole,
        }),
      })
        .then(() => {
          window.location.href = "/dashboard";
        })
        .catch(() => {
          window.location.href = "/dashboard";
        });
    }
  }, [user]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!businessName.trim() || !selectedRole) {
      toast.error("Please fill in all fields");
      return;
    }

    setIsSubmitting(true);

    try {
      const res = await fetch("/api/onboarding", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          businessName: businessName.trim(),
          role: selectedRole,
        }),
      });

      const data = await res.json();

      if (data.success) {
        toast.success("Welcome aboard! 🎉");
        // Hard redirect to force the middleware to get a fresh Clerk JWT
        // with the updated publicMetadata (onboardingComplete, role, etc.)
        if (selectedRole === "DEVELOPER") {
          window.location.href = "/dashboard";
        } else {
          window.location.href = "/dashboard";
        }
      } else {
        toast.error(data.error?.message ?? "Something went wrong");
      }
    } catch {
      toast.error("Network error — please try again");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex min-h-[70vh] items-center justify-center">
      <div className="w-full max-w-lg space-y-6">
        <div className="text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10">
            <Building2 className="h-8 w-8 text-primary" />
          </div>
          <h1 className="mt-4 text-2xl font-bold tracking-tight">
            Welcome to AI Agent Marketplace
          </h1>
          <p className="mt-1 text-muted-foreground">
            Set up your account to get started.
            {user?.firstName ? ` Hi, ${user.firstName}!` : ""}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Business Name */}
          <div className="space-y-2">
            <Label htmlFor="businessName">Business / Organisation Name</Label>
            <Input
              id="businessName"
              placeholder="e.g. Acme Solutions"
              value={businessName}
              onChange={(e) => setBusinessName(e.target.value)}
              required
              minLength={2}
              maxLength={100}
              disabled={isSubmitting}
            />
            <p className="text-xs text-muted-foreground">
              This creates your isolated tenant on the platform.
            </p>
          </div>

          {/* Role Selection */}
          <div className="space-y-2">
            <Label>I want to...</Label>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {ROLES.map((role) => (
                <Card
                  key={role.id}
                  className={cn(
                    "cursor-pointer transition-all hover:border-primary/50",
                    selectedRole === role.id &&
                      "border-primary bg-primary/5 ring-1 ring-primary",
                  )}
                  onClick={() => !isSubmitting && setSelectedRole(role.id)}
                >
                  <CardHeader className="pb-2">
                    <role.icon
                      className={cn(
                        "h-6 w-6",
                        selectedRole === role.id
                          ? "text-primary"
                          : "text-muted-foreground",
                      )}
                    />
                    <CardTitle className="text-base">{role.label}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground">
                      {role.description}
                    </p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>

          {/* POPIA Notice */}
          <p className="text-xs text-muted-foreground">
            By continuing, you consent to the processing of your data in
            accordance with POPIA (Protection of Personal Information Act).
            Your data is stored securely and isolated within your tenant.
          </p>

          {/* Submit */}
          <Button
            type="submit"
            className="w-full"
            size="lg"
            disabled={isSubmitting || !businessName.trim() || !selectedRole}
          >
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Setting up your account...
              </>
            ) : (
              "Complete Setup"
            )}
          </Button>
        </form>
      </div>
    </div>
  );
}
