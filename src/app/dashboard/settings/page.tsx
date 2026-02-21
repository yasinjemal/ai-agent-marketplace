// =============================================================
// /dashboard/settings — Tenant settings page
// =============================================================

import { Settings } from "lucide-react";
import { TenantSettingsForm } from "./tenant-settings-form";

export const metadata = {
  title: "Settings — AI Agent Marketplace",
  description: "Manage your tenant and account settings.",
};

export default function SettingsPage() {
  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-1">
        <div className="flex items-center gap-2">
          <Settings className="h-6 w-6 text-primary" />
          <h1 className="text-2xl font-bold tracking-tight">Settings</h1>
        </div>
        <p className="text-muted-foreground">
          Manage your business profile and tenant settings.
        </p>
      </div>

      <TenantSettingsForm />
    </div>
  );
}
