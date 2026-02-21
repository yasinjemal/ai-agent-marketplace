// =============================================================
// AgentCard — Reusable card for agent display in grids
// Used on marketplace listing, developer dashboard, and admin.
// =============================================================

import Link from "next/link";
import { Bot, Star, Zap } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { formatZAR, cn } from "@/lib/utils";
import type { AgentStatus, PricingModel } from "@prisma/client";

export interface AgentCardData {
  id: string;
  name: string;
  slug: string;
  description: string;
  iconUrl: string | null;
  category: string;
  tags: string[];
  pricingModel: PricingModel;
  priceInCents: number;
  averageRating: number;
  totalExecutions: number;
  status: AgentStatus;
  version?: string;
  isPublished?: boolean;
  developer: {
    firstName: string | null;
    lastName: string | null;
  };
}

interface AgentCardProps {
  agent: AgentCardData;
  /** Render action buttons at the bottom (developer dashboard) */
  actions?: React.ReactNode;
  /** Link destination — defaults to public agent detail page */
  href?: string;
}

const STATUS_STYLES: Record<AgentStatus, { label: string; className: string }> = {
  DRAFT: { label: "Draft", className: "bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300" },
  PENDING_REVIEW: { label: "Pending Review", className: "bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200" },
  APPROVED: { label: "Approved", className: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200" },
  REJECTED: { label: "Rejected", className: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200" },
  SUSPENDED: { label: "Suspended", className: "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200" },
};

function pricingLabel(model: PricingModel, priceInCents: number): string {
  switch (model) {
    case "FREE":
      return "Free";
    case "PER_EXECUTION":
      return `${formatZAR(priceInCents)} / run`;
    case "MONTHLY_FLAT":
      return `${formatZAR(priceInCents)} / mo`;
    case "TIERED":
      return `From ${formatZAR(priceInCents)}`;
    default:
      return formatZAR(priceInCents);
  }
}

export function AgentCard({ agent, actions, href }: AgentCardProps) {
  const statusInfo = STATUS_STYLES[agent.status];
  const linkHref = href ?? `/agents/${agent.slug}`;

  const content = (
    <Card className="group flex h-full flex-col transition-shadow hover:shadow-md">
      <CardHeader className="space-y-2 pb-3">
        <div className="flex items-start justify-between">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
            {agent.iconUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={agent.iconUrl} alt="" className="h-8 w-8 rounded" />
            ) : (
              <Bot className="h-5 w-5 text-primary" />
            )}
          </div>
          <Badge variant="outline" className={cn("text-xs", statusInfo.className)}>
            {statusInfo.label}
          </Badge>
        </div>
        <div>
          <h3 className="font-semibold leading-tight group-hover:text-primary">
            {agent.name}
          </h3>
          <p className="mt-0.5 text-xs text-muted-foreground">
            by {agent.developer.firstName ?? "Unknown"} {agent.developer.lastName ?? ""}
          </p>
        </div>
      </CardHeader>

      <CardContent className="flex-1 pb-3">
        <p className="line-clamp-2 text-sm text-muted-foreground">{agent.description}</p>
        <div className="mt-3 flex flex-wrap gap-1">
          <Badge variant="secondary" className="text-xs">
            {agent.category}
          </Badge>
          {agent.tags.slice(0, 2).map((tag) => (
            <Badge key={tag} variant="outline" className="text-xs">
              {tag}
            </Badge>
          ))}
          {agent.tags.length > 2 && (
            <Badge variant="outline" className="text-xs">
              +{agent.tags.length - 2}
            </Badge>
          )}
        </div>
      </CardContent>

      <CardFooter className="flex items-center justify-between border-t pt-3">
        <span className="text-sm font-medium text-primary">
          {pricingLabel(agent.pricingModel, agent.priceInCents)}
        </span>
        <div className="flex items-center gap-3 text-xs text-muted-foreground">
          <span className="flex items-center gap-0.5">
            <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
            {agent.averageRating.toFixed(1)}
          </span>
          <span className="flex items-center gap-0.5">
            <Zap className="h-3 w-3" />
            {agent.totalExecutions}
          </span>
        </div>
      </CardFooter>
    </Card>
  );

  // If there are custom actions, don't wrap in a link — the actions area handles navigation
  if (actions) {
    return (
      <div className="flex flex-col">
        <Link href={linkHref} className="flex-1">
          {content}
        </Link>
        <div className="mt-2 flex items-center gap-2">{actions}</div>
      </div>
    );
  }

  return <Link href={linkHref}>{content}</Link>;
}
