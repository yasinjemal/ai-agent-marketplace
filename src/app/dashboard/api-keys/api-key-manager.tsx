// =============================================================
// ApiKeyManager — Client component for managing API keys
// Handles create, list, revoke, and copy flows.
// =============================================================

"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import {
  Copy,
  Key,
  Loader2,
  Plus,
  ShieldAlert,
  Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface ApiKeyItem {
  id: string;
  label: string;
  keyPrefix: string;
  lastUsedAt: string | null;
  expiresAt: string | null;
  createdAt: string;
}

interface NewKeyResponse {
  id: string;
  label: string;
  keyPrefix: string;
  rawKey: string;
  createdAt: string;
}

export function ApiKeyManager() {
  const [keys, setKeys] = useState<ApiKeyItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [createLabel, setCreateLabel] = useState("");
  const [newKey, setNewKey] = useState<NewKeyResponse | null>(null);
  const [revokeTarget, setRevokeTarget] = useState<ApiKeyItem | null>(null);
  const [isRevoking, setIsRevoking] = useState(false);

  const fetchKeys = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/settings/api-keys");
      const data = await res.json();
      if (data.success) {
        setKeys(data.data);
      }
    } catch {
      toast.error("Failed to load API keys");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchKeys();
  }, [fetchKeys]);

  const handleCreate = async () => {
    if (!createLabel.trim()) {
      toast.error("Please enter a label for the key");
      return;
    }
    setIsCreating(true);
    try {
      const res = await fetch("/api/settings/api-keys", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ label: createLabel.trim() }),
      });
      const data = await res.json();
      if (data.success) {
        setNewKey(data.data);
        setCreateLabel("");
        fetchKeys();
        toast.success("API key created!");
      } else {
        toast.error(data.error?.message ?? "Failed to create key");
      }
    } catch {
      toast.error("Network error");
    } finally {
      setIsCreating(false);
    }
  };

  const handleRevoke = async () => {
    if (!revokeTarget) return;
    setIsRevoking(true);
    try {
      const res = await fetch(`/api/settings/api-keys/${revokeTarget.id}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (data.success) {
        toast.success("API key revoked");
        setRevokeTarget(null);
        fetchKeys();
      } else {
        toast.error(data.error?.message ?? "Failed to revoke key");
      }
    } catch {
      toast.error("Network error");
    } finally {
      setIsRevoking(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success("Copied to clipboard!");
  };

  return (
    <div className="space-y-6">
      {/* Create New Key */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Create API Key</CardTitle>
          <CardDescription>
            API keys allow OpenClaw and external tools to execute your marketplace agents.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-end gap-3">
            <div className="flex-1 space-y-2">
              <Label htmlFor="key-label">Label</Label>
              <Input
                id="key-label"
                placeholder="e.g. OpenClaw Production"
                value={createLabel}
                onChange={(e) => setCreateLabel(e.target.value)}
                maxLength={100}
              />
            </div>
            <Button onClick={handleCreate} disabled={isCreating}>
              {isCreating ? (
                <Loader2 className="mr-1 h-4 w-4 animate-spin" />
              ) : (
                <Plus className="mr-1 h-4 w-4" />
              )}
              Generate Key
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* New Key Dialog */}
      <Dialog open={!!newKey} onOpenChange={(open) => !open && setNewKey(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ShieldAlert className="h-5 w-5 text-amber-500" />
              Save Your API Key
            </DialogTitle>
            <DialogDescription>
              This is the only time you&apos;ll see this key. Copy it now and store it securely.
            </DialogDescription>
          </DialogHeader>
          {newKey && (
            <div className="space-y-3">
              <Label>API Key</Label>
              <div className="flex items-center gap-2">
                <Input
                  readOnly
                  value={newKey.rawKey}
                  className="font-mono text-xs"
                />
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => copyToClipboard(newKey.rawKey)}
                >
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                Use this key in the <code className="rounded bg-muted px-1">X-API-Key</code> header
                or as <code className="rounded bg-muted px-1">AGENT_MARKETPLACE_API_KEY</code> in
                your OpenClaw config.
              </p>
            </div>
          )}
          <DialogFooter>
            <Button onClick={() => setNewKey(null)}>I&apos;ve saved my key</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Keys Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Active Keys</CardTitle>
          <CardDescription>
            {keys.length} key{keys.length !== 1 ? "s" : ""} active. Maximum 10 per tenant.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : keys.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-2 rounded-lg border border-dashed py-8">
              <Key className="h-8 w-8 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">No API keys yet</p>
              <p className="text-xs text-muted-foreground">
                Create one above to start integrating with OpenClaw.
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Label</TableHead>
                  <TableHead>Key</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead>Last Used</TableHead>
                  <TableHead className="w-[80px]" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {keys.map((key) => (
                  <TableRow key={key.id}>
                    <TableCell className="font-medium">{key.label}</TableCell>
                    <TableCell>
                      <code className="rounded bg-muted px-2 py-0.5 text-xs">
                        {key.keyPrefix}...
                      </code>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {new Date(key.createdAt).toLocaleDateString("en-ZA")}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {key.lastUsedAt
                        ? new Date(key.lastUsedAt).toLocaleDateString("en-ZA")
                        : "Never"}
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-destructive hover:text-destructive"
                        onClick={() => setRevokeTarget(key)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Revoke Confirmation Dialog */}
      <Dialog open={!!revokeTarget} onOpenChange={(open) => !open && setRevokeTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Revoke API Key</DialogTitle>
            <DialogDescription>
              Are you sure you want to revoke <strong>{revokeTarget?.label}</strong> (
              <code className="text-xs">{revokeTarget?.keyPrefix}...</code>)?
              Any integrations using this key will stop working immediately.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRevokeTarget(null)}>
              Cancel
            </Button>
            <Button variant="destructive" disabled={isRevoking} onClick={handleRevoke}>
              {isRevoking ? (
                <Loader2 className="mr-1 h-4 w-4 animate-spin" />
              ) : (
                <Trash2 className="mr-1 h-4 w-4" />
              )}
              Revoke
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
