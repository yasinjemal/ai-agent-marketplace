// =============================================================
// Home — Landing page for AI Agent Marketplace
// =============================================================

import Link from "next/link";
import { ArrowRight, Bot, Shield, Zap, Building2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { SUBSCRIPTION_PLANS } from "@/constants";
import { formatZAR } from "@/lib/utils";

const FEATURES = [
  {
    icon: Bot,
    title: "AI Agents for SMEs",
    description:
      "Customer support, invoicing, scheduling, marketing — ready-to-use AI agents purpose-built for South African businesses.",
  },
  {
    icon: Zap,
    title: "No Code Required",
    description:
      "Subscribe and deploy in minutes. No AI expertise needed — just pick the agents that fit your business.",
  },
  {
    icon: Shield,
    title: "POPIA Compliant",
    description:
      "All agents and data processing comply with South African data protection regulations.",
  },
  {
    icon: Building2,
    title: "Multi-Tenant Platform",
    description:
      "Isolated tenant data, role-based access, and enterprise-grade security from day one.",
  },
] as const;

export default function HomePage() {
  return (
    <div className="space-y-16 py-8">
      {/* Hero */}
      <section className="flex flex-col items-center gap-6 text-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10">
          <Bot className="h-8 w-8 text-primary" />
        </div>
        <h1 className="max-w-2xl text-4xl font-bold tracking-tight sm:text-5xl">
          AI Agents Built for{" "}
          <span className="text-primary">South African SMEs</span>
        </h1>
        <p className="max-w-xl text-lg text-muted-foreground">
          Discover, subscribe, and deploy ready-to-use AI agents — from customer
          support bots to invoice generators. Grow your business with AI, no
          code required.
        </p>
        <div className="flex gap-3">
          <Button size="lg" asChild>
            <Link href="/agents">
              Browse Marketplace
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
          <Button size="lg" variant="outline" asChild>
            <Link href="/dashboard/agents">Developer Portal</Link>
          </Button>
        </div>
      </section>

      {/* Features */}
      <section className="space-y-6">
        <h2 className="text-center text-2xl font-bold tracking-tight">
          Why AI Agent Marketplace?
        </h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {FEATURES.map((feature) => (
            <Card key={feature.title}>
              <CardHeader className="pb-3">
                <feature.icon className="h-8 w-8 text-primary" />
                <CardTitle className="text-lg">{feature.title}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  {feature.description}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* Pricing */}
      <section className="space-y-6">
        <h2 className="text-center text-2xl font-bold tracking-tight">
          Simple, Transparent Pricing
        </h2>
        <p className="text-center text-muted-foreground">
          All prices in South African Rand (ZAR). Start free, scale as you grow.
        </p>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Object.values(SUBSCRIPTION_PLANS).map((plan) => (
            <Card
              key={plan.id}
              className={
                plan.id === "growth"
                  ? "border-primary shadow-md"
                  : undefined
              }
            >
              <CardHeader>
                {plan.id === "growth" && (
                  <span className="mb-1 text-xs font-semibold text-primary">
                    MOST POPULAR
                  </span>
                )}
                <CardTitle>{plan.name}</CardTitle>
                <p className="text-sm text-muted-foreground">
                  {plan.description}
                </p>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-3xl font-bold">
                  {plan.priceInCents === 0 && plan.id !== "enterprise"
                    ? "Free"
                    : plan.id === "enterprise"
                      ? "Custom"
                      : formatZAR(plan.priceInCents)}
                  {plan.priceInCents > 0 && (
                    <span className="text-sm font-normal text-muted-foreground">
                      {" "}
                      /mo
                    </span>
                  )}
                </p>
                <ul className="space-y-2 text-sm">
                  {plan.features.map((feature) => (
                    <li key={feature} className="flex items-center gap-2">
                      <span className="text-primary">✓</span>
                      {feature}
                    </li>
                  ))}
                </ul>
                <Button
                  variant={plan.id === "growth" ? "default" : "outline"}
                  className="w-full"
                  asChild
                >
                  <Link href="/pricing">
                    {plan.id === "enterprise"
                      ? "Contact Sales"
                      : plan.priceInCents === 0
                        ? "Start Free Trial"
                        : `Get ${plan.name}`}
                  </Link>
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>
    </div>
  );
}
