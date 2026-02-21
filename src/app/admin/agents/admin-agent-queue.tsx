// =============================================================
// AdminAgentQueue — Client component for approval workflow
// Shows pending agents, approve/reject with reason dialog.
// =============================================================

"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import {
  Bot,
  Check,
  ExternalLink,
  Loader2,
  Star,
  X,
  Zap,
} from "lucide-react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { formatZAR } from "@/lib/utils";

type PricingModel = "FREE" | "PER_EXECUTION" | "MONTHLY_FLAT" | "TIERED";

interface PendingAgent {
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
  status: string;
  version: string;
  isPublished: boolean;
  createdAt: string;
  developer: {
    firstName: string | null;
    lastName: string | null;
  };
}

export function AdminAgentQueue() {
  const [agents, setAgents] = useState<PendingAgent[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Reject dialog state
  const [rejectTarget, setRejectTarget] = useState<PendingAgent | null>(null);
  const [rejectionReason, setRejectionReason] = useState("");
  const [isRejecting, setIsRejecting] = useState(false);

  // Approve loading
  const [approvingId, setApprovingId] = useState<string | null>(null);

  const fetchPendingAgents = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/agents?view=admin");
      const data = await res.json();
      if (data.success && data.data) {
        setAgents(data.data.agents);
      } else {
        toast.error(data.error?.message ?? "Failed to load queue");
      }
    } catch {
      toast.error("Network error");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPendingAgents();
  }, [fetchPendingAgents]);

  // Approve an agent
  const handleApprove = async (agentId: string) => {
    setApprovingId(agentId);
    try {
      const res = await fetch(`/api/agents/${agentId}/review`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "approve" }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success("Agent approved and published!");
        fetchPendingAgents();
      } else {
        toast.error(data.error?.message ?? "Approval failed");
      }
    } catch {
      toast.error("Network error");
    } finally {
      setApprovingId(null);
    }
  };

  // Reject an agent
  const handleReject = async () => {
    if (!rejectTarget || rejectionReason.length < 10) {
      toast.error("Rejection reason must be at least 10 characters");
      return;
    }
    setIsRejecting(true);
    try {
      const res = await fetch(`/api/agents/${rejectTarget.id}/review`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "reject",
          rejectionReason,
        }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success("Agent rejected with feedback");
        setRejectTarget(null);
        setRejectionReason("");
        fetchPendingAgents();
      } else {
        toast.error(data.error?.message ?? "Rejection failed");
      }
    } catch {
      toast.error("Network error");
    } finally {
      setIsRejecting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (agents.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 rounded-lg border border-dashed py-16">
        <Check className="h-10 w-10 text-green-500" />
        <p className="text-lg font-medium">All caught up!</p>
        <p className="text-sm text-muted-foreground">
          No agents are pending review right now.
        </p>
      </div>
    );
  }

  return (
    <>
      <p className="text-sm text-muted-foreground">
        {agents.length} agent{agents.length !== 1 ? "s" : ""} pending review
      </p>

      <div className="space-y-4">
        {agents.map((agent) => {
          const developerName = [agent.developer.firstName, agent.developer.lastName]
            .filter(Boolean)
            .join(" ") || "Unknown";

          return (
            <Card key={agent.id}>
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                      {agent.iconUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={agent.iconUrl} alt="" className="h-8 w-8 rounded" />
                      ) : (
                        <Bot className="h-5 w-5 text-primary" />
                      )}
                    </div>
                    <div>
                      <h3 className="font-semibold">{agent.name}</h3>
                      <p className="text-sm text-muted-foreground">
                        by {developerName} · v{agent.version} · submitted{" "}
                        {new Date(agent.createdAt).toLocaleDateString("en-ZA")}
                      </p>
                    </div>
                  </div>
                  <Badge variant="outline" className="bg-amber-100 text-amber-800">
                    Pending Review
                  </Badge>
                </div>
              </CardHeader>

              <CardContent className="pb-3">
                <p className="text-sm text-muted-foreground">{agent.description}</p>
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <Badge variant="secondary">{agent.category}</Badge>
                  {agent.tags.map((tag) => (
                    <Badge key={tag} variant="outline" className="text-xs">
                      {tag}
                    </Badge>
                  ))}
                  <span className="text-xs text-muted-foreground">·</span>
                  <span className="text-sm font-medium text-primary">
                    {agent.pricingModel === "FREE"
                      ? "Free"
                      : formatZAR(agent.priceInCents)}
                  </span>
                </div>
              </CardContent>

              <CardFooter className="flex items-center justify-between border-t pt-3">
                <Button variant="ghost" size="sm" asChild>
                  <Link href={`/agents/${agent.slug}`}>
                    <ExternalLink className="mr-1 h-3 w-3" />
                    Preview
                  </Link>
                </Button>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-destructive hover:text-destructive"
                    onClick={() => {
                      setRejectTarget(agent);
                      setRejectionReason("");
                    }}
                  >
                    <X className="mr-1 h-3 w-3" />
                    Reject
                  </Button>
                  <Button
                    variant="default"
                    size="sm"
                    disabled={approvingId === agent.id}
                    onClick={() => handleApprove(agent.id)}
                  >
                    {approvingId === agent.id ? (
                      <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                    ) : (
                      <Check className="mr-1 h-3 w-3" />
                    )}
                    Approve
                  </Button>
                </div>
              </CardFooter>
            </Card>
          );
        })}
      </div>

      {/* Reject dialog */}
      <Dialog
        open={!!rejectTarget}
        onOpenChange={(open) => {
          if (!open) {
            setRejectTarget(null);
            setRejectionReason("");
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject Agent</DialogTitle>
            <DialogDescription>
              Provide feedback for the developer explaining why{" "}
              <strong>{rejectTarget?.name}</strong> was rejected. They&apos;ll use this to
              improve and resubmit.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-1.5">
            <Label htmlFor="reason">Rejection Reason *</Label>
            <Textarea
              id="reason"
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              placeholder="Please explain what needs to be fixed before this agent can be approved..."
              rows={4}
              minLength={10}
              maxLength={500}
            />
            <p className="text-xs text-muted-foreground">
              Minimum 10 characters. Be specific and constructive.
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRejectTarget(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              disabled={isRejecting || rejectionReason.length < 10}
              onClick={handleReject}
            >
              {isRejecting && <Loader2 className="mr-1 h-4 w-4 animate-spin" />}
              Reject Agent
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
