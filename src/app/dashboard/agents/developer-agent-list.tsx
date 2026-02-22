// =============================================================
// DeveloperAgentList — Client component for managing agents
// Handles CRUD, submit for review. Uses Clerk auth (cookies).
// =============================================================

"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import {
  Edit,
  Download,
  History,
  Loader2,
  Plus,
  Send,
  Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AgentCard, type AgentCardData } from "@/components/agents/agent-card";
import { AgentFormDialog } from "./agent-form-dialog";
import { AgentVersionPanel } from "./agent-version-panel";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface AgentsResponse {
  success: boolean;
  data?: {
    agents: AgentCardData[];
    pagination: { page: number; limit: number; total: number; totalPages: number };
  };
  error?: { code: string; message: string };
}

export function DeveloperAgentList() {
  const [agents, setAgents] = useState<AgentCardData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editAgent, setEditAgent] = useState<AgentCardData | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<AgentCardData | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState<string | null>(null);
  const [isExporting, setIsExporting] = useState<string | null>(null);
  const [versionAgent, setVersionAgent] = useState<AgentCardData | null>(null);

  const fetchAgents = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/agents?view=developer");
      const data: AgentsResponse = await res.json();
      if (data.success && data.data) {
        setAgents(data.data.agents);
      } else {
        toast.error(data.error?.message ?? "Failed to load agents");
      }
    } catch {
      toast.error("Network error loading agents");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAgents();
  }, [fetchAgents]);

  // Submit agent for review
  const handleSubmit = async (agentId: string) => {
    setIsSubmitting(agentId);
    try {
      const res = await fetch(`/api/agents/${agentId}/submit`, {
        method: "POST",
      });
      const data = await res.json();
      if (data.success) {
        toast.success("Agent submitted for review!");
        fetchAgents();
      } else {
        toast.error(data.error?.message ?? "Failed to submit");
      }
    } catch {
      toast.error("Network error");
    } finally {
      setIsSubmitting(null);
    }
  };

  // Export agent as OpenClaw SKILL.md
  const handleExport = async (agentId: string) => {
    setIsExporting(agentId);
    try {
      const res = await fetch(`/api/agents/${agentId}/export?format=download`);
      if (!res.ok) {
        const data = await res.json();
        toast.error(data.error?.message ?? "Export failed");
        return;
      }
      const blob = await res.blob();
      const disposition = res.headers.get("Content-Disposition") ?? "";
      const filenameMatch = disposition.match(/filename="?([^"]+)"?/);
      const filename = filenameMatch?.[1] ?? "SKILL.md";

      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      toast.success("SKILL.md exported successfully!");
    } catch {
      toast.error("Network error exporting agent");
    } finally {
      setIsExporting(null);
    }
  };

  // Delete agent — only draft/rejected
  const handleDelete = async () => {
    if (!deleteTarget) return;
    setIsDeleting(true);
    try {
      const res = await fetch(`/api/agents/${deleteTarget.id}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (data.success) {
        toast.success("Agent deleted");
        setDeleteTarget(null);
        fetchAgents();
      } else {
        toast.error(data.error?.message ?? "Failed to delete");
      }
    } catch {
      toast.error("Network error");
    } finally {
      setIsDeleting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <>
      {/* Toolbar */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {agents.length} agent{agents.length !== 1 ? "s" : ""}
        </p>
        <Button size="sm" onClick={() => setIsCreateOpen(true)}>
          <Plus className="mr-1 h-4 w-4" />
          Create Agent
        </Button>
      </div>

      {/* Agent grid */}
      {agents.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-3 rounded-lg border border-dashed py-16">
          <p className="text-lg font-medium">No agents yet</p>
          <p className="text-sm text-muted-foreground">
            Create your first AI agent and submit it for marketplace review.
          </p>
          <Button size="sm" onClick={() => setIsCreateOpen(true)}>
            <Plus className="mr-1 h-4 w-4" />
            Create Agent
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {agents.map((agent) => (
            <AgentCard
              key={agent.id}
              agent={agent}
              href={`/agents/${agent.slug}`}
              actions={
                <div className="flex w-full items-center gap-1.5">
                  {/* Edit */}
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1"
                    onClick={() => setEditAgent(agent)}
                  >
                    <Edit className="mr-1 h-3 w-3" />
                    Edit
                  </Button>

                  {/* Versions */}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setVersionAgent(agent)}
                    title="Version History"
                  >
                    <History className="h-3 w-3" />
                  </Button>

                  {/* Submit for review — only draft/rejected */}
                  {(agent.status === "DRAFT" || agent.status === "REJECTED") && (
                    <Button
                      variant="default"
                      size="sm"
                      className="flex-1"
                      disabled={isSubmitting === agent.id}
                      onClick={() => handleSubmit(agent.id)}
                    >
                      {isSubmitting === agent.id ? (
                        <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                      ) : (
                        <Send className="mr-1 h-3 w-3" />
                      )}
                      Submit
                    </Button>
                  )}

                  {/* Status badge for non-actionable states */}
                  {agent.status === "PENDING_REVIEW" && (
                    <Badge variant="outline" className="bg-amber-100 text-amber-800">
                      Under Review
                    </Badge>
                  )}

                  {/* Export as OpenClaw SKILL.md — only approved */}
                  {agent.status === "APPROVED" && (
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={isExporting === agent.id}
                      onClick={() => handleExport(agent.id)}
                      title="Export as OpenClaw SKILL.md"
                    >
                      {isExporting === agent.id ? (
                        <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                      ) : (
                        <Download className="mr-1 h-3 w-3" />
                      )}
                      SKILL.md
                    </Button>
                  )}

                  {/* Delete — only draft/rejected */}
                  {(agent.status === "DRAFT" || agent.status === "REJECTED") && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-destructive hover:text-destructive"
                      onClick={() => setDeleteTarget(agent)}
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  )}
                </div>
              }
            />
          ))}
        </div>
      )}

      {/* Create dialog */}
      <AgentFormDialog
        open={isCreateOpen}
        onOpenChange={setIsCreateOpen}
        onSuccess={fetchAgents}
      />

      {/* Edit dialog */}
      {editAgent && (
        <AgentFormDialog
          open={!!editAgent}
          onOpenChange={(open: boolean) => {
            if (!open) setEditAgent(null);
          }}
          agent={editAgent}
          onSuccess={fetchAgents}
        />
      )}

      {/* Delete confirmation dialog */}
      <Dialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Agent</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete <strong>{deleteTarget?.name}</strong>? This action
              cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteTarget(null)}>
              Cancel
            </Button>
            <Button variant="destructive" disabled={isDeleting} onClick={handleDelete}>
              {isDeleting ? (
                <Loader2 className="mr-1 h-4 w-4 animate-spin" />
              ) : (
                <Trash2 className="mr-1 h-4 w-4" />
              )}
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Version history dialog */}
      <Dialog open={!!versionAgent} onOpenChange={(open) => !open && setVersionAgent(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Version History — {versionAgent?.name}</DialogTitle>
            <DialogDescription>
              View version snapshots and roll back to a previous state.
            </DialogDescription>
          </DialogHeader>
          {versionAgent && (
            <AgentVersionPanel
              agentId={versionAgent.id}
              currentVersion={versionAgent.version ?? "1.0.0"}
              onRollback={fetchAgents}
            />
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
