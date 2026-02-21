// =============================================================
// TenantSettingsForm — Client component for editing tenant
// =============================================================

"use client";

import { useEffect, useState } from "react";
import { Loader2, Save } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";

interface TenantData {
  id: string;
  name: string;
  slug: string;
  createdAt: string;
  _count: { users: number; agents: number };
}

export function TenantSettingsForm() {
  const [tenant, setTenant] = useState<TenantData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [name, setName] = useState("");

  useEffect(() => {
    async function fetchTenant() {
      try {
        const res = await fetch("/api/settings/tenant");
        const data = await res.json();
        if (data.success && data.data) {
          setTenant(data.data);
          setName(data.data.name);
        } else {
          toast.error("Failed to load tenant settings");
        }
      } catch {
        toast.error("Network error loading settings");
      } finally {
        setIsLoading(false);
      }
    }
    fetchTenant();
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    setIsSaving(true);
    try {
      const res = await fetch("/api/settings/tenant", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim() }),
      });
      const data = await res.json();
      if (data.success) {
        setTenant((prev) =>
          prev ? { ...prev, name: data.data.name, slug: data.data.slug } : prev,
        );
        toast.success("Tenant settings updated!");
      } else {
        toast.error(data.error?.message ?? "Update failed");
      }
    } catch {
      toast.error("Network error");
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!tenant) {
    return (
      <div className="rounded-lg border border-dashed p-8 text-center">
        <p className="text-muted-foreground">Unable to load tenant settings.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Business Profile</CardTitle>
          <CardDescription>
            Update your business name. This is visible across the platform.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSave} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="tenantName">Business Name</Label>
              <Input
                id="tenantName"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Your business name"
                required
                minLength={2}
                maxLength={100}
                disabled={isSaving}
              />
            </div>
            <div className="space-y-2">
              <Label>Slug (auto-generated)</Label>
              <p className="text-sm text-muted-foreground">{tenant.slug}</p>
            </div>
            <Button type="submit" disabled={isSaving || name === tenant.name}>
              {isSaving ? (
                <Loader2 className="mr-1 h-4 w-4 animate-spin" />
              ) : (
                <Save className="mr-1 h-4 w-4" />
              )}
              Save Changes
            </Button>
          </form>
        </CardContent>
      </Card>

      <Separator />

      <Card>
        <CardHeader>
          <CardTitle>Tenant Info</CardTitle>
          <CardDescription>Read-only details about your tenant.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Tenant ID</span>
            <code className="rounded bg-muted px-2 py-0.5 text-xs">{tenant.id}</code>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Team Members</span>
            <span className="font-medium">{tenant._count.users}</span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Agents</span>
            <span className="font-medium">{tenant._count.agents}</span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Created</span>
            <span className="font-medium">
              {new Date(tenant.createdAt).toLocaleDateString("en-ZA")}
            </span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
