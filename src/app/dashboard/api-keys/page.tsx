// =============================================================
// API Keys Dashboard Page (Server Component)
// =============================================================

import { Key } from "lucide-react";
import { ApiKeyManager } from "./api-key-manager";

export const metadata = {
  title: "API Keys — AI Agent Marketplace",
  description: "Manage API keys for OpenClaw and external integrations.",
};

export default function ApiKeysPage() {
  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-1">
        <div className="flex items-center gap-2">
          <Key className="h-6 w-6 text-primary" />
          <h1 className="text-2xl font-bold tracking-tight">API Keys</h1>
        </div>
        <p className="text-muted-foreground">
          Generate API keys to connect your agents with OpenClaw and other
          external tools.
        </p>
      </div>
      <ApiKeyManager />
    </div>
  );
}
