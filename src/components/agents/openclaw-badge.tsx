// =============================================================
// OpenClawBadge — "Works with OpenClaw" badge + integration info
// Displays on the agent detail page sidebar for approved agents.
// =============================================================

"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Copy, ExternalLink, Terminal } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";

interface OpenClawBadgeProps {
  agentSlug: string;
  agentId: string;
}

export function OpenClawBadge({ agentSlug, agentId }: OpenClawBadgeProps) {
  const [showDetails, setShowDetails] = useState(false);
  const appUrl = typeof window !== "undefined"
    ? window.location.origin
    : "https://ai-agents.co.za";

  const webhookUrl = `${appUrl}/api/agents/${agentId}/webhook`;

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast.success(`${label} copied to clipboard!`);
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">Integrations</CardTitle>
          <Badge className="bg-emerald-100 text-emerald-800 hover:bg-emerald-200">
            🦞 OpenClaw Ready
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-sm text-muted-foreground">
          Use this agent from WhatsApp, Telegram, Slack, or any channel via OpenClaw.
        </p>

        <Button
          variant="outline"
          size="sm"
          className="w-full"
          onClick={() => setShowDetails(!showDetails)}
        >
          <Terminal className="mr-1.5 h-4 w-4" />
          {showDetails ? "Hide" : "Show"} Setup Instructions
        </Button>

        {showDetails && (
          <div className="space-y-3 pt-1">
            <Separator />

            {/* Webhook URL */}
            <div className="space-y-1.5">
              <p className="text-xs font-medium text-muted-foreground">Webhook URL</p>
              <div className="flex items-center gap-1.5">
                <code className="flex-1 truncate rounded bg-muted px-2 py-1 text-xs">
                  {webhookUrl}
                </code>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 w-7 shrink-0 p-0"
                  onClick={() => copyToClipboard(webhookUrl, "Webhook URL")}
                >
                  <Copy className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>

            {/* cURL example */}
            <div className="space-y-1.5">
              <p className="text-xs font-medium text-muted-foreground">Quick Test</p>
              <div className="relative">
                <pre className="overflow-x-auto rounded bg-muted p-2 text-xs leading-relaxed">
{`curl -X POST "${webhookUrl}" \\
  -H "X-API-Key: YOUR_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{"input": {}}'`}
                </pre>
                <Button
                  variant="ghost"
                  size="sm"
                  className="absolute right-1 top-1 h-6 w-6 p-0"
                  onClick={() =>
                    copyToClipboard(
                      `curl -X POST "${webhookUrl}" -H "X-API-Key: YOUR_KEY" -H "Content-Type: application/json" -d '{"input": {}}'`,
                      "cURL command",
                    )
                  }
                >
                  <Copy className="h-3 w-3" />
                </Button>
              </div>
            </div>

            {/* OpenClaw config */}
            <div className="space-y-1.5">
              <p className="text-xs font-medium text-muted-foreground">OpenClaw Config</p>
              <pre className="overflow-x-auto rounded bg-muted p-2 text-xs leading-relaxed">
{`{
  "skills": {
    "entries": {
      "${agentSlug}": {
        "enabled": true,
        "apiKey": "YOUR_API_KEY"
      }
    }
  }
}`}
              </pre>
            </div>

            <Separator />

            <div className="flex flex-col gap-2">
              <Button variant="outline" size="sm" asChild>
                <a href="/dashboard/api-keys" className="gap-1.5">
                  <Terminal className="h-3.5 w-3.5" />
                  Get API Key
                </a>
              </Button>
              <Button variant="ghost" size="sm" asChild>
                <a
                  href="https://docs.openclaw.ai/tools/skills"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="gap-1.5"
                >
                  <ExternalLink className="h-3.5 w-3.5" />
                  OpenClaw Docs
                </a>
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
