// =============================================================
// Agent Execute Dialog — Client component for executing an agent
// Shows input form, submits to API, displays result.
// =============================================================

"use client";

import { useState } from "react";
import { Loader2, Play, CheckCircle2, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";

interface AgentExecuteDialogProps {
  agentId: string;
  agentName: string;
  inputSchema: Record<string, unknown>;
  /** Server-verified: user has a valid DB session */
  isAuthenticated?: boolean;
}

interface ExecutionResponse {
  success: boolean;
  data?: {
    executionId: string;
    status: string;
    outputPayload: unknown;
    executionTimeMs: number;
    costInCents: number;
    errorMessage: string | null;
  };
  error?: {
    code: string;
    message: string;
  };
}

export function AgentExecuteDialog({
  agentId,
  agentName,
  inputSchema,
  isAuthenticated,
}: AgentExecuteDialogProps) {
  const [open, setOpen] = useState(false);
  const [inputJson, setInputJson] = useState(
    JSON.stringify(schemaToExample(inputSchema), null, 2),
  );
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ExecutionResponse | null>(null);

  async function handleExecute() {
    setLoading(true);
    setResult(null);

    let payload: Record<string, unknown>;
    try {
      payload = JSON.parse(inputJson) as Record<string, unknown>;
    } catch {
      toast.error("Invalid JSON. Please check your input.");
      setLoading(false);
      return;
    }

    try {
      const res = await fetch(`/api/agents/${agentId}/execute`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ inputPayload: payload }),
      });

      const data = (await res.json()) as ExecutionResponse;
      setResult(data);

      if (data.success) {
        toast.success("Agent executed successfully!");
      } else {
        toast.error(data.error?.message ?? "Execution failed");
      }
    } catch (error) {
      toast.error("Network error. Please try again.");
      setResult({
        success: false,
        error: {
          code: "NETWORK_ERROR",
          message: error instanceof Error ? error.message : "Unknown error",
        },
      });
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {isAuthenticated ? (
        <DialogTrigger asChild>
          <Button className="w-full" size="lg">
            <Play className="mr-2 h-4 w-4" />
            Execute Agent
          </Button>
        </DialogTrigger>
      ) : (
        <Button className="w-full" size="lg" variant="outline" asChild>
          <a href="/sign-in">
            <Play className="mr-2 h-4 w-4" />
            Sign in to Execute
          </a>
        </Button>
      )}
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Execute {agentName}</DialogTitle>
          <DialogDescription>
            Provide the input payload below and click Execute. The agent will
            process your request and return a result.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Input Schema hint */}
          <div>
            <Label className="text-sm text-muted-foreground">
              Expected Input Schema
            </Label>
            <pre className="mt-1 max-h-[120px] overflow-auto rounded-md bg-muted p-2 text-xs">
              {String(JSON.stringify(inputSchema, null, 2))}
            </pre>
          </div>

          {/* Input payload editor */}
          <div>
            <Label htmlFor="input-payload">Input Payload (JSON)</Label>
            <Textarea
              id="input-payload"
              value={inputJson}
              onChange={(e) => setInputJson(e.target.value)}
              className="mt-1 min-h-[120px] font-mono text-sm"
              placeholder='{"key": "value"}'
              disabled={loading}
            />
          </div>

          {/* Execute button */}
          <Button
            onClick={handleExecute}
            disabled={loading}
            className="w-full"
          >
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Executing…
              </>
            ) : (
              <>
                <Play className="mr-2 h-4 w-4" />
                Execute
              </>
            )}
          </Button>

          {/* Result */}
          {result && (
            <div className="space-y-3 rounded-md border p-4">
              <div className="flex items-center gap-2">
                {result.success ? (
                  <>
                    <CheckCircle2 className="h-5 w-5 text-green-600" />
                    <span className="font-medium text-green-600">
                      Execution Successful
                    </span>
                  </>
                ) : (
                  <>
                    <AlertCircle className="h-5 w-5 text-destructive" />
                    <span className="font-medium text-destructive">
                      Execution Failed
                    </span>
                  </>
                )}
              </div>

              {result.data && (
                <div className="space-y-2 text-sm">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline">{result.data.status}</Badge>
                    <span className="text-muted-foreground">
                      {result.data.executionTimeMs}ms
                    </span>
                    {result.data.costInCents > 0 && (
                      <span className="text-muted-foreground">
                        Cost: R{(result.data.costInCents / 100).toFixed(2)}
                      </span>
                    )}
                  </div>
                  {result.data.outputPayload != null && (
                    <div>
                      <Label className="text-xs text-muted-foreground">
                        Output
                      </Label>
                      <pre className="mt-1 max-h-[200px] overflow-auto rounded-md bg-muted p-2 text-xs">
                        {String(JSON.stringify(result.data.outputPayload, null, 2))}
                      </pre>
                    </div>
                  )}
                  {result.data.errorMessage && (
                    <p className="text-sm text-destructive">
                      {result.data.errorMessage}
                    </p>
                  )}
                </div>
              )}

              {result.error && !result.data && (
                <p className="text-sm text-destructive">
                  {result.error.message}
                </p>
              )}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

// -------------------------------------------------------------
// Helper: Generate example input from schema
// Creates a simple example object from JSON Schema-like structure
// -------------------------------------------------------------

function schemaToExample(
  schema: Record<string, unknown>,
): Record<string, unknown> {
  const example: Record<string, unknown> = {};
  const properties = schema.properties as
    | Record<string, Record<string, unknown>>
    | undefined;

  if (properties) {
    for (const [key, prop] of Object.entries(properties)) {
      switch (prop.type) {
        case "string":
          example[key] = prop.default ?? prop.example ?? `example_${key}`;
          break;
        case "number":
        case "integer":
          example[key] = prop.default ?? prop.example ?? 0;
          break;
        case "boolean":
          example[key] = prop.default ?? false;
          break;
        case "array":
          example[key] = prop.default ?? [];
          break;
        default:
          example[key] = prop.default ?? `<${key}>`;
      }
    }
  } else {
    // Fallback: use top-level keys as example
    for (const [key, value] of Object.entries(schema)) {
      if (typeof value === "string") {
        example[key] = `example_${key}`;
      }
    }
  }

  return Object.keys(example).length > 0 ? example : { input: "your_value" };
}
