// =============================================================
// /agents/[slug] — Public agent detail page (Server Component)
// Shows full description, pricing, developer info, reviews.
// =============================================================

import { notFound } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Bot,
  Calendar,
  Star,
  Tag,
  Zap,
} from "lucide-react";
import { getAgentBySlug } from "@/lib/services/agent";
import { getReviews, getUserReview } from "@/lib/services/review";
import { getSession } from "@/lib/auth";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { formatZAR } from "@/lib/utils";
import { AgentExecuteDialog } from "@/components/agents/agent-execute-dialog";
import { AgentReviews } from "@/components/agents/agent-reviews";

type PricingModel = "FREE" | "PER_EXECUTION" | "MONTHLY_FLAT" | "TIERED";

type PageProps = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: PageProps) {
  const { slug } = await params;
  const agent = await getAgentBySlug(slug);
  if (!agent) return { title: "Agent Not Found" };
  return {
    title: `${agent.name} — AI Agent Marketplace`,
    description: agent.description,
  };
}

function pricingLabel(model: PricingModel, priceInCents: number): string {
  switch (model) {
    case "FREE":
      return "Free";
    case "PER_EXECUTION":
      return `${formatZAR(priceInCents)} per execution`;
    case "MONTHLY_FLAT":
      return `${formatZAR(priceInCents)} / month`;
    case "TIERED":
      return `From ${formatZAR(priceInCents)} / month`;
    default:
      return formatZAR(priceInCents);
  }
}

export default async function AgentDetailPage({ params }: PageProps) {
  const { slug } = await params;
  const agent = await getAgentBySlug(slug);

  if (!agent || agent.status !== "APPROVED" || !agent.isPublished) {
    notFound();
  }

  // Fetch reviews and user review in parallel
  const session = await getSession();
  const [reviewsData, userReview] = await Promise.all([
    getReviews(agent.id, { page: 1, limit: 10, sortBy: "newest" }),
    session ? getUserReview(agent.id, session.userId) : Promise.resolve(null),
  ]);

  const initialReviewData = {
    ...reviewsData,
    userReview,
  };

  const developerName = [agent.developer.firstName, agent.developer.lastName]
    .filter(Boolean)
    .join(" ") || "Unknown Developer";

  return (
    <div className="space-y-6">
      {/* Back link */}
      <Button variant="ghost" size="sm" asChild>
        <Link href="/agents">
          <ArrowLeft className="mr-1 h-4 w-4" />
          Back to Marketplace
        </Link>
      </Button>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Main content — 2 cols */}
        <div className="space-y-6 lg:col-span-2">
          {/* Hero */}
          <div className="flex items-start gap-4">
            <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-xl bg-primary/10">
              {agent.iconUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={agent.iconUrl} alt="" className="h-12 w-12 rounded-lg" />
              ) : (
                <Bot className="h-8 w-8 text-primary" />
              )}
            </div>
            <div className="min-w-0 flex-1">
              <h1 className="text-2xl font-bold tracking-tight">{agent.name}</h1>
              <p className="text-sm text-muted-foreground">
                by {developerName} · v{agent.version}
              </p>
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <Badge variant="secondary">{agent.category}</Badge>
                {agent.tags.map((tag: string) => (
                  <Badge key={tag} variant="outline">
                    {tag}
                  </Badge>
                ))}
              </div>
            </div>
          </div>

          <Separator />

          {/* Description */}
          <div className="space-y-2">
            <h2 className="text-lg font-semibold">About this Agent</h2>
            <p className="text-muted-foreground">{agent.description}</p>
            {agent.longDescription && (
              <div className="prose prose-sm mt-4 max-w-none text-muted-foreground">
                {agent.longDescription.split("\n").map((para: string, i: number) => (
                  <p key={i}>{para}</p>
                ))}
              </div>
            )}
          </div>

          <Separator />

          {/* Reviews */}
          <AgentReviews agentId={agent.id} initialData={initialReviewData} isAuthenticated={!!session} />
        </div>

        {/* Sidebar — pricing & stats */}
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Pricing</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-2xl font-bold text-primary">
                {pricingLabel(agent.pricingModel, agent.priceInCents)}
              </p>
              <Badge variant="outline" className="capitalize">
                {agent.pricingModel.toLowerCase().replace("_", " ")}
              </Badge>
              <AgentExecuteDialog
                agentId={agent.id}
                agentName={agent.name}
                inputSchema={agent.inputSchema as Record<string, unknown>}
                isAuthenticated={!!session}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Stats</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between text-sm">
                <span className="flex items-center gap-1.5 text-muted-foreground">
                  <Star className="h-4 w-4" /> Rating
                </span>
                <span className="font-medium">
                  {agent.averageRating.toFixed(1)} / 5.0
                </span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="flex items-center gap-1.5 text-muted-foreground">
                  <Zap className="h-4 w-4" /> Executions
                </span>
                <span className="font-medium">
                  {agent.totalExecutions.toLocaleString()}
                </span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="flex items-center gap-1.5 text-muted-foreground">
                  <Tag className="h-4 w-4" /> Version
                </span>
                <span className="font-medium">{agent.version}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="flex items-center gap-1.5 text-muted-foreground">
                  <Calendar className="h-4 w-4" /> Published
                </span>
                <span className="font-medium">
                  {new Date(agent.createdAt).toLocaleDateString("en-ZA")}
                </span>
              </div>
            </CardContent>
          </Card>

          {/* Developer info */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Developer</CardTitle>
            </CardHeader>
            <CardContent className="flex items-center gap-3">
              <Avatar>
                <AvatarFallback>
                  {(agent.developer.firstName?.[0] ?? "") +
                    (agent.developer.lastName?.[0] ?? "")}
                </AvatarFallback>
              </Avatar>
              <div>
                <p className="font-medium">{developerName}</p>
                <p className="text-xs text-muted-foreground">Agent Developer</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
