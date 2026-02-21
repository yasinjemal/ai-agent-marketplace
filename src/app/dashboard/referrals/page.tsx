// =============================================================
// /dashboard/referrals — Referral programme page (Server)
// =============================================================

import { redirect } from "next/navigation";
import { requireAuth } from "@/lib/auth";
import { getReferralStats, getReferralHistory } from "@/lib/services/referral";
import { ReferralDashboard } from "./referral-dashboard";

export const metadata = {
  title: "Referrals — AI Agent Marketplace",
};

export default async function ReferralsPage() {
  let session;
  try {
    session = await requireAuth();
  } catch {
    redirect("/sign-in");
  }

  const [stats, history] = await Promise.all([
    getReferralStats(session.tenantId),
    getReferralHistory(session.tenantId),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Referral Programme</h1>
        <p className="text-muted-foreground">
          Invite other businesses and earn R50 credit for each successful referral
        </p>
      </div>

      <ReferralDashboard stats={stats} history={history} />
    </div>
  );
}
