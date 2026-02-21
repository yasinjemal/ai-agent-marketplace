// =============================================================
// /dashboard/billing — Subscription management + payment history
// =============================================================

"use client";

import { useEffect, useState, useCallback } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import {
  CreditCard,
  Loader2,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  ArrowRight,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
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
  DialogTrigger,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { formatZAR } from "@/lib/utils";
import Link from "next/link";

// Types for API response
interface SubscriptionData {
  id: string;
  status: string;
  planId: string;
  priceInCents: number;
  currentPeriodStart: string;
  currentPeriodEnd: string;
  trialEndsAt: string | null;
  canceledAt: string | null;
}

interface UsageData {
  planId: string;
  planName: string;
  maxAgents: number;
  currentAgents: number;
  priceInCents: number;
}

interface PaymentData {
  id: string;
  amountInCents: number;
  status: string;
  isVerified: boolean;
  paidAt: string | null;
  createdAt: string;
  subscription: { planId: string };
}

interface BillingData {
  subscription: SubscriptionData | null;
  usage: UsageData;
  payments: PaymentData[];
  totalPayments: number;
}

const STATUS_BADGES: Record<string, { variant: "default" | "secondary" | "destructive" | "outline"; label: string }> = {
  ACTIVE: { variant: "default", label: "Active" },
  TRIAL: { variant: "secondary", label: "Trial" },
  PAST_DUE: { variant: "destructive", label: "Past Due" },
  CANCELED: { variant: "outline", label: "Canceled" },
  EXPIRED: { variant: "outline", label: "Expired" },
};

const PAYMENT_STATUS_ICONS: Record<string, React.ReactNode> = {
  COMPLETED: <CheckCircle2 className="h-4 w-4 text-green-500" />,
  PENDING: <Loader2 className="h-4 w-4 text-yellow-500 animate-spin" />,
  FAILED: <XCircle className="h-4 w-4 text-red-500" />,
  REFUNDED: <AlertTriangle className="h-4 w-4 text-orange-500" />,
};

export default function BillingPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [data, setData] = useState<BillingData | null>(null);
  const [loading, setLoading] = useState(true);
  const [canceling, setCanceling] = useState(false);
  const [cancelReason, setCancelReason] = useState("");
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);

  const fetchBilling = useCallback(async () => {
    try {
      const res = await fetch("/api/subscriptions");
      const json = await res.json();
      if (json.success) {
        setData(json.data);
      }
    } catch {
      toast.error("Failed to load billing data");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchBilling();
  }, [fetchBilling]);

  // Handle return from PayFast
  useEffect(() => {
    const status = searchParams.get("status");
    if (status === "success") {
      toast.success("Payment successful! Your subscription is now active.");
      router.replace("/dashboard/billing");
    } else if (status === "cancelled") {
      toast.info("Payment was cancelled.");
      router.replace("/dashboard/billing");
    }
  }, [searchParams, router]);

  const handleCancel = async () => {
    setCanceling(true);
    try {
      const res = await fetch("/api/subscriptions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason: cancelReason || undefined }),
      });

      const json = await res.json();
      if (json.success) {
        toast.success("Subscription cancelled");
        setCancelDialogOpen(false);
        setCancelReason("");
        fetchBilling();
      } else {
        toast.error(json.error?.message ?? "Failed to cancel");
      }
    } catch {
      toast.error("Network error — please try again");
    } finally {
      setCanceling(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const { subscription, usage, payments } = data ?? {
    subscription: null,
    usage: { planId: "free", planName: "Free Trial", maxAgents: 2, currentAgents: 0, priceInCents: 0 },
    payments: [],
    totalPayments: 0,
  };

  const hasActiveSub =
    subscription &&
    (subscription.status === "ACTIVE" || subscription.status === "TRIAL");

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">
          Billing & Subscription
        </h1>
        <p className="text-muted-foreground">
          Manage your subscription plan and view payment history.
        </p>
      </div>

      {/* Current Plan Card */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div className="flex items-center gap-3">
            <CreditCard className="h-5 w-5 text-primary" />
            <CardTitle>Current Plan</CardTitle>
          </div>
          {subscription && (
            <Badge variant={STATUS_BADGES[subscription.status]?.variant ?? "outline"}>
              {STATUS_BADGES[subscription.status]?.label ?? subscription.status}
            </Badge>
          )}
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            {/* Plan Name */}
            <div>
              <p className="text-sm text-muted-foreground">Plan</p>
              <p className="text-lg font-semibold">{usage.planName}</p>
            </div>

            {/* Price */}
            <div>
              <p className="text-sm text-muted-foreground">Monthly Price</p>
              <p className="text-lg font-semibold">
                {usage.priceInCents > 0
                  ? `${formatZAR(usage.priceInCents)}/mo`
                  : "Free"}
              </p>
            </div>

            {/* Agent Usage */}
            <div>
              <p className="text-sm text-muted-foreground">Agent Usage</p>
              <p className="text-lg font-semibold">
                {usage.currentAgents} /{" "}
                {usage.maxAgents === Infinity ? "∞" : usage.maxAgents} agents
              </p>
            </div>
          </div>

          {/* Period Info */}
          {subscription && (
            <div className="rounded-md border p-3 text-sm">
              {subscription.trialEndsAt && subscription.status === "TRIAL" && (
                <p>
                  <span className="font-medium">Trial ends:</span>{" "}
                  {new Date(subscription.trialEndsAt).toLocaleDateString("en-ZA")}
                </p>
              )}
              <p>
                <span className="font-medium">Current period:</span>{" "}
                {new Date(subscription.currentPeriodStart).toLocaleDateString("en-ZA")}
                {" — "}
                {new Date(subscription.currentPeriodEnd).toLocaleDateString("en-ZA")}
              </p>
              {subscription.canceledAt && (
                <p className="text-destructive">
                  <span className="font-medium">Cancelled:</span>{" "}
                  {new Date(subscription.canceledAt).toLocaleDateString("en-ZA")}
                </p>
              )}
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-3 pt-2">
            {!hasActiveSub && (
              <Button asChild>
                <Link href="/pricing">
                  Upgrade Plan
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
            )}

            {hasActiveSub && (
              <>
                <Button variant="outline" asChild>
                  <Link href="/pricing">Change Plan</Link>
                </Button>

                <Dialog
                  open={cancelDialogOpen}
                  onOpenChange={setCancelDialogOpen}
                >
                  <DialogTrigger asChild>
                    <Button variant="destructive">Cancel Subscription</Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Cancel Subscription</DialogTitle>
                      <DialogDescription>
                        Are you sure? You&apos;ll lose access to premium features at
                        the end of your current billing period.
                      </DialogDescription>
                    </DialogHeader>
                    <Textarea
                      placeholder="Optional: Tell us why you&apos;re cancelling..."
                      value={cancelReason}
                      onChange={(e) => setCancelReason(e.target.value)}
                      rows={3}
                    />
                    <DialogFooter>
                      <Button
                        variant="outline"
                        onClick={() => setCancelDialogOpen(false)}
                      >
                        Keep Subscription
                      </Button>
                      <Button
                        variant="destructive"
                        onClick={handleCancel}
                        disabled={canceling}
                      >
                        {canceling ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Cancelling...
                          </>
                        ) : (
                          "Yes, Cancel"
                        )}
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Payment History */}
      <Card>
        <CardHeader>
          <CardTitle>Payment History</CardTitle>
        </CardHeader>
        <CardContent>
          {payments.length === 0 ? (
            <p className="py-8 text-center text-muted-foreground">
              No payments yet.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Plan</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Verified</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {payments.map((payment) => (
                  <TableRow key={payment.id}>
                    <TableCell>
                      {new Date(
                        payment.paidAt ?? payment.createdAt,
                      ).toLocaleDateString("en-ZA")}
                    </TableCell>
                    <TableCell className="capitalize">
                      {payment.subscription.planId}
                    </TableCell>
                    <TableCell>{formatZAR(payment.amountInCents)}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1.5">
                        {PAYMENT_STATUS_ICONS[payment.status]}
                        <span className="capitalize">
                          {payment.status.toLowerCase()}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      {payment.isVerified ? (
                        <CheckCircle2 className="h-4 w-4 text-green-500" />
                      ) : (
                        <XCircle className="h-4 w-4 text-muted-foreground" />
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
