// =============================================================
// TeamManagement — Client component for team + invites
// =============================================================

"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import {
  Clock,
  Loader2,
  Mail,
  Plus,
  Trash2,
  UserMinus,
  Users,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";

interface TeamMember {
  id: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  role: string;
  isActive: boolean;
  createdAt: string;
}

interface TeamInvite {
  id: string;
  email: string;
  role: string;
  status: string;
  expiresAt: string;
  createdAt: string;
  invitedBy: {
    firstName: string | null;
    lastName: string | null;
  };
}

const ROLE_LABELS: Record<string, string> = {
  ADMIN: "Admin",
  DEVELOPER: "Developer",
  BUSINESS_USER: "Business User",
};

export function TeamManagement() {
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [invites, setInvites] = useState<TeamInvite[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isInviteOpen, setIsInviteOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [removingId, setRemovingId] = useState<string | null>(null);
  const [revokingId, setRevokingId] = useState<string | null>(null);

  // Invite form
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState("BUSINESS_USER");

  const fetchTeam = useCallback(async () => {
    try {
      const res = await fetch("/api/team");
      const data = await res.json();
      if (data.success) {
        setMembers(data.data.members);
        setInvites(data.data.invites);
      } else {
        toast.error(data.error?.message ?? "Failed to load team");
      }
    } catch {
      toast.error("Network error");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTeam();
  }, [fetchTeam]);

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteEmail.trim()) return;

    setIsSubmitting(true);
    try {
      const res = await fetch("/api/team", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: inviteEmail.trim().toLowerCase(),
          role: inviteRole,
        }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success(`Invite sent to ${inviteEmail}`);
        setIsInviteOpen(false);
        setInviteEmail("");
        setInviteRole("BUSINESS_USER");
        fetchTeam();
      } else {
        toast.error(data.error?.message ?? "Failed to send invite");
      }
    } catch {
      toast.error("Network error");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRemoveMember = async (memberId: string) => {
    setRemovingId(memberId);
    try {
      const res = await fetch(`/api/team/${memberId}`, { method: "DELETE" });
      const data = await res.json();
      if (data.success) {
        toast.success("Member removed");
        fetchTeam();
      } else {
        toast.error(data.error?.message ?? "Failed to remove member");
      }
    } catch {
      toast.error("Network error");
    } finally {
      setRemovingId(null);
    }
  };

  const handleRevokeInvite = async (inviteId: string) => {
    setRevokingId(inviteId);
    try {
      const res = await fetch(`/api/team/invites/${inviteId}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (data.success) {
        toast.success("Invite revoked");
        fetchTeam();
      } else {
        toast.error(data.error?.message ?? "Failed to revoke invite");
      }
    } catch {
      toast.error("Network error");
    } finally {
      setRevokingId(null);
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
    <div className="space-y-6">
      {/* Team Members */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              <CardTitle className="text-lg">
                Members ({members.filter((m) => m.isActive).length})
              </CardTitle>
            </div>
            <Button size="sm" onClick={() => setIsInviteOpen(true)}>
              <Plus className="mr-1 h-3 w-3" />
              Invite
            </Button>
          </div>
          <CardDescription>
            People in your organization who can access the platform.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {members
              .filter((m) => m.isActive)
              .map((member) => (
                <div
                  key={member.id}
                  className="flex items-center justify-between rounded-lg border px-4 py-3"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 text-sm font-medium text-primary">
                      {member.firstName?.[0] ?? member.email[0].toUpperCase()}
                    </div>
                    <div>
                      <p className="text-sm font-medium">
                        {[member.firstName, member.lastName]
                          .filter(Boolean)
                          .join(" ") || member.email}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {member.email}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline">
                      {ROLE_LABELS[member.role] ?? member.role}
                    </Badge>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-destructive hover:text-destructive"
                      onClick={() => handleRemoveMember(member.id)}
                      disabled={removingId === member.id}
                      title="Remove member"
                    >
                      {removingId === member.id ? (
                        <Loader2 className="h-3 w-3 animate-spin" />
                      ) : (
                        <UserMinus className="h-3 w-3" />
                      )}
                    </Button>
                  </div>
                </div>
              ))}
          </div>
        </CardContent>
      </Card>

      {/* Pending Invites */}
      {invites.length > 0 && (
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Mail className="h-5 w-5" />
              <CardTitle className="text-lg">
                Pending Invites ({invites.length})
              </CardTitle>
            </div>
            <CardDescription>
              Invitations waiting to be accepted.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {invites.map((invite) => (
                <div
                  key={invite.id}
                  className="flex items-center justify-between rounded-lg border border-dashed px-4 py-3"
                >
                  <div>
                    <p className="text-sm font-medium">{invite.email}</p>
                    <div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
                      <Badge variant="outline" className="text-xs">
                        {ROLE_LABELS[invite.role] ?? invite.role}
                      </Badge>
                      <Clock className="h-3 w-3" />
                      Expires{" "}
                      {new Date(invite.expiresAt).toLocaleDateString("en-ZA")}
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleRevokeInvite(invite.id)}
                    disabled={revokingId === invite.id}
                    title="Revoke invite"
                  >
                    {revokingId === invite.id ? (
                      <Loader2 className="h-3 w-3 animate-spin" />
                    ) : (
                      <X className="h-3 w-3" />
                    )}
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Invite Dialog */}
      <Dialog open={isInviteOpen} onOpenChange={setIsInviteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Invite Team Member</DialogTitle>
            <DialogDescription>
              Send an email invitation to join your organization. They&apos;ll
              receive a link to accept.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleInvite} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="inviteEmail">Email Address</Label>
              <Input
                id="inviteEmail"
                type="email"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                placeholder="colleague@company.co.za"
                required
              />
            </div>
            <div className="space-y-2">
              <Label>Role</Label>
              <Select value={inviteRole} onValueChange={setInviteRole}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="BUSINESS_USER">Business User</SelectItem>
                  <SelectItem value="DEVELOPER">Developer</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Business Users can execute agents. Developers can also create
                and publish agents.
              </p>
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsInviteOpen(false)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? (
                  <Loader2 className="mr-1 h-4 w-4 animate-spin" />
                ) : (
                  <Mail className="mr-1 h-4 w-4" />
                )}
                Send Invite
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
