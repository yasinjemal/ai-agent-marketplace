// =============================================================
// /pricing — Subscription plan selection and checkout
// =============================================================

"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useUser } from "@clerk/nextjs";
import { Check, Loader2, Sparkles, Zap } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { SUBSCRIPTION_PLANS } from "@/constants";
import { formatZAR } from "@/lib/utils";
import { cn } from "@/lib/utils";

type CheckoutPlan = "starter" | "growth";

export default function PricingPage() {
  const { isSignedIn } = useUser();
  const router = useRouter();
  const [loadingPlan, setLoadingPlan] = useState<string | null>(null);

  const handleCheckout = async (planId: CheckoutPlan) => {
    if (!isSignedIn) {
      router.push("/sign-up");
      return;
    }

    setLoadingPlan(planId);
    try {
      const res = await fetch("/api/subscriptions/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ planId }),
      });

      const data = await res.json();

      if (data.success) {
        // Redirect to PayFast checkout
        window.location.href = data.data.checkoutUrl;
      } else {
        toast.error(data.error?.message ?? "Failed to start checkout");
      }
    } catch {
      toast.error("Network error — please try again");
    } finally {
      setLoadingPlan(null);
    }
  };

  const plans = Object.values(SUBSCRIPTION_PLANS);

  return (
    <div className="space-y-10 py-8">
      {/* Header */}
      <div className="text-center space-y-3">
        <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
          Choose Your Plan
        </h1>
        <p className="mx-auto max-w-xl text-lg text-muted-foreground">
          All prices in South African Rand (ZAR). Start free, upgrade anytime.
          Cancel at any time.
        </p>
      </div>

      {/* Plan Cards */}
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {plans.map((plan) => {
          const isPopular = plan.id === "growth";
          const isFree = plan.id === "free";
          const isEnterprise = plan.id === "enterprise";
          const isCheckout = plan.id === "starter" || plan.id === "growth";
          const isLoading = loadingPlan === plan.id;

          return (
            <Card
              key={plan.id}
              className={cn(
                "relative flex flex-col",
                isPopular && "border-primary shadow-lg ring-1 ring-primary",
              )}
            >
              {isPopular && (
                <Badge className="absolute -top-3 left-1/2 -translate-x-1/2 gap-1">
                  <Sparkles className="h-3 w-3" />
                  Most Popular
                </Badge>
              )}

              <CardHeader className="flex-1">
                <CardTitle className="flex items-center gap-2 text-xl">
                  {plan.name}
                  {isPopular && <Zap className="h-5 w-5 text-primary" />}
                </CardTitle>
                <p className="text-sm text-muted-foreground">
                  {plan.description}
                </p>

                {/* Price */}
                <div className="pt-4">
                  <p className="text-4xl font-bold tracking-tight">
                    {isFree
                      ? "Free"
                      : isEnterprise
                        ? "Custom"
                        : formatZAR(plan.priceInCents)}
                  </p>
                  {plan.priceInCents > 0 && (
                    <p className="text-sm text-muted-foreground">/month</p>
                  )}
                  {isFree && (
                    <p className="text-sm text-muted-foreground">
                      7-day trial
                    </p>
                  )}
                </div>
              </CardHeader>

              <CardContent className="space-y-4">
                {/* Features */}
                <ul className="space-y-2.5">
                  {plan.features.map((feature) => (
                    <li
                      key={feature}
                      className="flex items-start gap-2.5 text-sm"
                    >
                      <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>

                {/* CTA Button */}
                {isCheckout ? (
                  <Button
                    className="w-full"
                    variant={isPopular ? "default" : "outline"}
                    size="lg"
                    onClick={() => handleCheckout(plan.id as CheckoutPlan)}
                    disabled={isLoading}
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Redirecting...
                      </>
                    ) : (
                      `Get ${plan.name}`
                    )}
                  </Button>
                ) : isFree ? (
                  <Button
                    className="w-full"
                    variant="outline"
                    size="lg"
                    onClick={() =>
                      isSignedIn
                        ? router.push("/agents")
                        : router.push("/sign-up")
                    }
                  >
                    Start Free Trial
                  </Button>
                ) : (
                  <Button
                    className="w-full"
                    variant="outline"
                    size="lg"
                    onClick={() =>
                      (window.location.href = "mailto:hello@aimarketplace.co.za")
                    }
                  >
                    Contact Sales
                  </Button>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* FAQ / Trust signals */}
      <div className="mx-auto max-w-2xl text-center text-sm text-muted-foreground space-y-2">
        <p>
          All payments are processed securely via{" "}
          <strong>PayFast</strong> — South Africa&apos;s leading payment gateway.
        </p>
        <p>
          Payments in ZAR. Cancel anytime. No lock-in contracts.
          POPIA compliant.
        </p>
      </div>
    </div>
  );
}
