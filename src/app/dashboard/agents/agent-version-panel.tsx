// =============================================================
// AgentVersionPanel — Version history & rollback UI (Phase 10)
// =============================================================

"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import {
  Clock,
  GitBranch,
  History,
  Loader2,
  Plus,
  RotateCcw,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface VersionItem {
  id: string;
  version: string;
  description: string;
  executionEndpoint: string;
  pricingModel: string;
  priceInCents: number;
  changelog: string | null;
  createdAt: string;
  createdBy: {
    firstName: string | null;
    lastName: string | null;
  };
}

interface AgentVersionPanelProps {
  agentId: string;
  currentVersion: string;
  onRollback?: () => void;
}

export function AgentVersionPanel({
  agentId,
  currentVersion,
  onRollback,
}: AgentVersionPanelProps) {
  const [versions, setVersions] = useState<VersionItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [rollingBack, setRollingBack] = useState<string | null>(null);

  // Create form state
  const [newVersion, setNewVersion] = useState("");
  const [changelog, setChangelog] = useState("");

  const fetchVersions = useCallback(async () => {
    try {
      const res = await fetch(`/api/agents/${agentId}/versions`);
      const data = await res.json();
      if (data.success) {
        setVersions(data.data);
      }
    } catch {
      // silent fail
    } finally {
      setIsLoading(false);
    }
  }, [agentId]);

  useEffect(() => {
    fetchVersions();
  }, [fetchVersions]);

  const handleCreateVersion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newVersion.trim()) return;

    setIsSubmitting(true);
    try {
      const res = await fetch(`/api/agents/${agentId}/versions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          version: newVersion.trim(),
          changelog: changelog.trim() || undefined,
        }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success(`Version ${newVersion} created`);
        setIsCreateOpen(false);
        setNewVersion("");
        setChangelog("");
        fetchVersions();
      } else {
        toast.error(data.error?.message ?? "Failed to create version");
      }
    } catch {
      toast.error("Network error");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRollback = async (versionId: string, versionStr: string) => {
    setRollingBack(versionId);
    try {
      const res = await fetch(
        `/api/agents/${agentId}/versions/${versionId}/rollback`,
        { method: "POST" },
      );
      const data = await res.json();
      if (data.success) {
        toast.success(`Rolled back to v${versionStr}`);
        onRollback?.();
      } else {
        toast.error(data.error?.message ?? "Rollback failed");
      }
    } catch {
      toast.error("Network error");
    } finally {
      setRollingBack(null);
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <History className="h-5 w-5" />
            <CardTitle className="text-lg">Version History</CardTitle>
          </div>
          <Button size="sm" onClick={() => setIsCreateOpen(true)}>
            <Plus className="mr-1 h-3 w-3" />
            New Version
          </Button>
        </div>
        <CardDescription>
          Current: <Badge variant="secondary">v{currentVersion}</Badge>
        </CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : versions.length === 0 ? (
          <div className="rounded-lg border border-dashed py-6 text-center">
            <GitBranch className="mx-auto h-8 w-8 text-muted-foreground" />
            <p className="mt-2 text-sm text-muted-foreground">
              No versions saved yet. Create a snapshot to start tracking changes.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {versions.map((v, idx) => (
              <div
                key={v.id}
                className="flex items-start justify-between gap-3 rounded-lg border p-3"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <Badge variant={idx === 0 ? "default" : "outline"}>
                      v{v.version}
                    </Badge>
                    {v.version === currentVersion && (
                      <Badge variant="secondary" className="text-xs">
                        current
                      </Badge>
                    )}
                  </div>
                  {v.changelog && (
                    <p className="mt-1 text-sm text-muted-foreground line-clamp-2">
                      {v.changelog}
                    </p>
                  )}
                  <div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
                    <Clock className="h-3 w-3" />
                    {new Date(v.createdAt).toLocaleDateString("en-ZA")}
                    <span>•</span>
                    {v.createdBy.firstName ?? "Unknown"}{" "}
                    {v.createdBy.lastName ?? ""}
                  </div>
                </div>
                {v.version !== currentVersion && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleRollback(v.id, v.version)}
                    disabled={rollingBack === v.id}
                  >
                    {rollingBack === v.id ? (
                      <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                    ) : (
                      <RotateCcw className="mr-1 h-3 w-3" />
                    )}
                    Rollback
                  </Button>
                )}
              </div>
            ))}
          </div>
        )}
      </CardContent>

      {/* Create Version Dialog */}
      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New Version</DialogTitle>
            <DialogDescription>
              Save a snapshot of the current agent configuration as a new
              version.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCreateVersion} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="version">Version Number</Label>
              <Input
                id="version"
                value={newVersion}
                onChange={(e) => setNewVersion(e.target.value)}
                placeholder="e.g. 1.1.0"
                pattern="\d+\.\d+\.\d+"
                required
              />
              <p className="text-xs text-muted-foreground">
                Use semantic versioning (major.minor.patch)
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="changelog">Changelog (optional)</Label>
              <Textarea
                id="changelog"
                value={changelog}
                onChange={(e) => setChangelog(e.target.value)}
                placeholder="What changed in this version..."
                rows={3}
                maxLength={2000}
              />
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsCreateOpen(false)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? (
                  <Loader2 className="mr-1 h-4 w-4 animate-spin" />
                ) : (
                  <Plus className="mr-1 h-4 w-4" />
                )}
                Create Version
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
