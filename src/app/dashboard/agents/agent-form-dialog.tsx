// =============================================================
// AgentFormDialog — Create or Edit agent dialog
// Uses Zod schema validation matching API expectations.
// =============================================================

"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
import { AGENT_CATEGORIES } from "@/constants";
import type { AgentCardData } from "@/components/agents/agent-card";

interface AgentFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  /** If provided, dialog is in "edit" mode */
  agent?: AgentCardData;
}

export function AgentFormDialog({
  open,
  onOpenChange,
  onSuccess,
  agent,
}: AgentFormDialogProps) {
  const isEditing = !!agent;
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form state
  const [name, setName] = useState(agent?.name ?? "");
  const [description, setDescription] = useState(agent?.description ?? "");
  const [category, setCategory] = useState(agent?.category ?? "");
  const [tags, setTags] = useState(agent?.tags.join(", ") ?? "");
  const [pricingModel, setPricingModel] = useState<string>(agent?.pricingModel ?? "FREE");
  const [priceInCents, setPriceInCents] = useState(
    agent ? String(agent.priceInCents / 100) : "0",
  );
  const [executionEndpoint, setExecutionEndpoint] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    const tagArray = tags
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean);

    const priceValue = Math.round(parseFloat(priceInCents || "0") * 100);

    try {
      if (isEditing) {
        // PATCH update
        const body: Record<string, unknown> = {};
        if (name !== agent.name) body.name = name;
        if (description !== agent.description) body.description = description;
        if (category !== agent.category) body.category = category;
        body.tags = tagArray;
        body.pricingModel = pricingModel;
        body.priceInCents = priceValue;

        const res = await fetch(`/api/agents/${agent.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
        const data = await res.json();
        if (data.success) {
          toast.success("Agent updated!");
          onOpenChange(false);
          onSuccess();
        } else {
          toast.error(data.error?.message ?? "Update failed");
        }
      } else {
        // POST create
        const body = {
          name,
          description,
          category,
          tags: tagArray,
          pricingModel,
          priceInCents: priceValue,
          executionEndpoint: executionEndpoint || "https://api.example.com/agent",
          inputSchema: { prompt: { type: "string", description: "User input" } },
          outputSchema: { response: { type: "string", description: "Agent response" } },
        };

        const res = await fetch("/api/agents", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
        const data = await res.json();
        if (data.success) {
          toast.success("Agent created!");
          onOpenChange(false);
          onSuccess();
          // Reset form
          setName("");
          setDescription("");
          setCategory("");
          setTags("");
          setPricingModel("FREE");
          setPriceInCents("0");
          setExecutionEndpoint("");
        } else {
          toast.error(data.error?.message ?? "Create failed");
        }
      }
    } catch {
      toast.error("Network error");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{isEditing ? "Edit Agent" : "Create New Agent"}</DialogTitle>
          <DialogDescription>
            {isEditing
              ? "Update your agent details. Editing an approved agent will reset it to draft status."
              : "Fill in the details for your new AI agent. You can submit it for review once saved."}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Name */}
          <div className="space-y-1.5">
            <Label htmlFor="name">Name *</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Customer Support Bot"
              required
              minLength={3}
              maxLength={100}
            />
          </div>

          {/* Description */}
          <div className="space-y-1.5">
            <Label htmlFor="description">Description *</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="A brief description of what your agent does..."
              required
              minLength={10}
              maxLength={500}
              rows={3}
            />
          </div>

          {/* Category */}
          <div className="space-y-1.5">
            <Label>Category *</Label>
            <Select value={category} onValueChange={setCategory} required>
              <SelectTrigger>
                <SelectValue placeholder="Select a category" />
              </SelectTrigger>
              <SelectContent>
                {AGENT_CATEGORIES.map((cat) => (
                  <SelectItem key={cat.value} value={cat.value}>
                    {cat.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Tags */}
          <div className="space-y-1.5">
            <Label htmlFor="tags">Tags</Label>
            <Input
              id="tags"
              value={tags}
              onChange={(e) => setTags(e.target.value)}
              placeholder="ai, chatbot, support (comma separated)"
            />
            <p className="text-xs text-muted-foreground">
              Comma-separated, max 10 tags
            </p>
          </div>

          {/* Pricing */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Pricing Model</Label>
              <Select value={pricingModel} onValueChange={setPricingModel}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="FREE">Free</SelectItem>
                  <SelectItem value="PER_EXECUTION">Per Execution</SelectItem>
                  <SelectItem value="MONTHLY_FLAT">Monthly Flat</SelectItem>
                  <SelectItem value="TIERED">Tiered</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="price">Price (ZAR)</Label>
              <Input
                id="price"
                type="number"
                step="0.01"
                min="0"
                value={priceInCents}
                onChange={(e) => setPriceInCents(e.target.value)}
                placeholder="0.00"
              />
            </div>
          </div>

          {/* Execution endpoint — only for create */}
          {!isEditing && (
            <div className="space-y-1.5">
              <Label htmlFor="endpoint">Execution Endpoint *</Label>
              <Input
                id="endpoint"
                type="url"
                value={executionEndpoint}
                onChange={(e) => setExecutionEndpoint(e.target.value)}
                placeholder="https://api.example.com/agent/run"
                required
              />
              <p className="text-xs text-muted-foreground">
                The URL your agent will be invoked at
              </p>
            </div>
          )}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="mr-1 h-4 w-4 animate-spin" />}
              {isEditing ? "Save Changes" : "Create Agent"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
