// =============================================================
// OpenClaw Integration Service
// Generates SKILL.md files from marketplace agent data.
// Follows the AgentSkills spec used by OpenClaw.
// =============================================================

const APP_URL =
  process.env.NEXT_PUBLIC_APP_URL ?? "https://ai-agents.co.za";

// -------------------------------------------------------------
// Types
// -------------------------------------------------------------

interface AgentForExport {
  id: string;
  name: string;
  slug: string;
  description: string;
  longDescription: string | null;
  category: string;
  tags: string[];
  version: string;
  pricingModel: string;
  priceInCents: number;
  inputSchema: unknown;
  executionEndpoint: string;
  developer: {
    firstName: string | null;
    lastName: string | null;
  };
}

// -------------------------------------------------------------
// SKILL.md Generator
// -------------------------------------------------------------

/**
 * Generate an OpenClaw-compatible SKILL.md from a marketplace agent.
 *
 * The generated skill proxies through the marketplace webhook endpoint
 * so that authentication, rate-limiting, and billing still apply.
 */
export function generateSkillMd(agent: AgentForExport): string {
  const developerName =
    [agent.developer.firstName, agent.developer.lastName]
      .filter(Boolean)
      .join(" ") || "Unknown Developer";

  const webhookUrl = `${APP_URL}/api/agents/${agent.id}/webhook`;
  const agentPageUrl = `${APP_URL}/agents/${agent.slug}`;

  // Build metadata JSON (single-line, per AgentSkills spec)
  const metadata = {
    openclaw: {
      requires: {
        env: ["AGENT_MARKETPLACE_API_KEY"],
      },
      primaryEnv: "AGENT_MARKETPLACE_API_KEY",
      homepage: agentPageUrl,
    },
  };

  const metadataLine = JSON.stringify(metadata);

  // Build frontmatter
  const frontmatter = [
    "---",
    `name: ${slugToSkillName(agent.slug)}`,
    `description: ${escapeFrontmatter(agent.description)}`,
    `version: ${agent.version}`,
    `metadata: ${metadataLine}`,
    "---",
  ].join("\n");

  // Build instructions
  const instructions = buildInstructions(agent, {
    webhookUrl,
    agentPageUrl,
    developerName,
  });

  return `${frontmatter}\n\n${instructions}\n`;
}

// -------------------------------------------------------------
// Instruction Builder
// -------------------------------------------------------------

function buildInstructions(
  agent: AgentForExport,
  ctx: { webhookUrl: string; agentPageUrl: string; developerName: string },
): string {
  const sections: string[] = [];

  // Title
  sections.push(`# ${agent.name}`);
  sections.push("");
  sections.push(agent.description);

  // Developer & category
  sections.push("");
  sections.push(`**Developer:** ${ctx.developerName}`);
  sections.push(`**Category:** ${agent.category}`);
  if (agent.tags.length > 0) {
    sections.push(`**Tags:** ${agent.tags.join(", ")}`);
  }
  sections.push(`**Marketplace:** ${ctx.agentPageUrl}`);

  // Pricing
  sections.push("");
  sections.push("## Pricing");
  sections.push("");
  sections.push(formatPricing(agent.pricingModel, agent.priceInCents));

  // Usage instructions
  sections.push("");
  sections.push("## Usage");
  sections.push("");
  sections.push(
    "This skill connects to the AI Agent Marketplace SA. Execution requests " +
      "are proxied through the marketplace webhook for authentication, billing, and rate-limiting.",
  );

  // Input schema
  if (agent.inputSchema && typeof agent.inputSchema === "object") {
    sections.push("");
    sections.push("## Input Schema");
    sections.push("");
    sections.push("```json");
    sections.push(JSON.stringify(agent.inputSchema, null, 2));
    sections.push("```");
  }

  // Tool definition
  sections.push("");
  sections.push("## How to Execute");
  sections.push("");
  sections.push("Send a POST request to the webhook endpoint with your API key:");
  sections.push("");
  sections.push("```bash");
  sections.push(`curl -X POST "${ctx.webhookUrl}" \\`);
  sections.push(`  -H "X-API-Key: $AGENT_MARKETPLACE_API_KEY" \\`);
  sections.push(`  -H "Content-Type: application/json" \\`);
  sections.push(`  -d '{ "input": { /* your payload */ } }'`);
  sections.push("```");

  // Setup
  sections.push("");
  sections.push("## Setup");
  sections.push("");
  sections.push("1. Sign up at https://ai-agents.co.za");
  sections.push(
    "2. Go to **Dashboard → API Keys** and generate a new API key",
  );
  sections.push("3. Set `AGENT_MARKETPLACE_API_KEY` in your OpenClaw config:");
  sections.push("");
  sections.push("```json");
  sections.push(`{`);
  sections.push(`  "skills": {`);
  sections.push(`    "entries": {`);
  sections.push(`      "${slugToSkillName(agent.slug)}": {`);
  sections.push(`        "enabled": true,`);
  sections.push(`        "apiKey": "YOUR_API_KEY_HERE"`);
  sections.push(`      }`);
  sections.push(`    }`);
  sections.push(`  }`);
  sections.push(`}`);
  sections.push("```");

  // Long description
  if (agent.longDescription) {
    sections.push("");
    sections.push("## Details");
    sections.push("");
    sections.push(agent.longDescription);
  }

  return sections.join("\n");
}

// -------------------------------------------------------------
// Helpers
// -------------------------------------------------------------

/** Convert marketplace slug to OpenClaw skill name (kebab-case) */
function slugToSkillName(slug: string): string {
  return slug.toLowerCase().replace(/[^a-z0-9-]/g, "-");
}

/** Escape special characters for YAML frontmatter single-line values */
function escapeFrontmatter(value: string): string {
  // If value contains colons, quotes, or special chars, wrap in quotes
  if (/[:#"'|>{}[\]&*!?,]/.test(value)) {
    return `"${value.replace(/"/g, '\\"')}"`;
  }
  return value;
}

/** Format pricing model for human-readable display */
function formatPricing(model: string, priceInCents: number): string {
  const price = `R${(priceInCents / 100).toFixed(2)}`;
  switch (model) {
    case "FREE":
      return "This agent is **free** to use.";
    case "PER_EXECUTION":
      return `**${price}** per execution. Billed through the marketplace.`;
    case "MONTHLY_FLAT":
      return `**${price}/month** flat rate. Billed through the marketplace.`;
    case "TIERED":
      return `Starting from **${price}/month** (tiered pricing). Billed through the marketplace.`;
    default:
      return `${price} — billed through the marketplace.`;
  }
}
