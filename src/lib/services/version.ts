// =============================================================
// Agent Version Service — Version history & rollback (Phase 10)
// =============================================================

import { db } from "@/lib/db";
import { Prisma } from "@prisma/client";
import type { PricingModel } from "@prisma/client";

// -------------------------------------------------------------
// Types
// -------------------------------------------------------------

export interface AgentVersionInput {
  agentId: string;
  version: string;
  changelog?: string;
  createdById: string;
}

export interface VersionListItem {
  id: string;
  version: string;
  description: string;
  executionEndpoint: string;
  pricingModel: PricingModel;
  priceInCents: number;
  changelog: string | null;
  createdAt: Date;
  createdBy: {
    firstName: string | null;
    lastName: string | null;
  };
}

// -------------------------------------------------------------
// Create a version snapshot of the current agent state
// -------------------------------------------------------------

export async function createAgentVersion(
  input: AgentVersionInput,
): Promise<VersionListItem> {
  // Fetch current agent state to snapshot
  const agent = await db.agent.findUnique({
    where: { id: input.agentId },
    select: {
      description: true,
      longDescription: true,
      executionEndpoint: true,
      inputSchema: true,
      outputSchema: true,
      pricingModel: true,
      priceInCents: true,
    },
  });

  if (!agent) throw new Error("Agent not found");

  // Check for duplicate version
  const existing = await db.agentVersion.findUnique({
    where: {
      agentId_version: {
        agentId: input.agentId,
        version: input.version,
      },
    },
  });

  if (existing) throw new Error(`Version ${input.version} already exists`);

  const version = await db.agentVersion.create({
    data: {
      agentId: input.agentId,
      version: input.version,
      description: agent.description,
      longDescription: agent.longDescription,
      executionEndpoint: agent.executionEndpoint,
      inputSchema: agent.inputSchema as Prisma.InputJsonValue,
      outputSchema: agent.outputSchema as Prisma.InputJsonValue,
      pricingModel: agent.pricingModel,
      priceInCents: agent.priceInCents,
      changelog: input.changelog ?? null,
      createdById: input.createdById,
    },
    include: {
      createdBy: {
        select: { firstName: true, lastName: true },
      },
    },
  });

  // Update the agent's version field
  await db.agent.update({
    where: { id: input.agentId },
    data: { version: input.version },
  });

  return version;
}

// -------------------------------------------------------------
// List all versions for an agent
// -------------------------------------------------------------

export async function listAgentVersions(
  agentId: string,
): Promise<VersionListItem[]> {
  return db.agentVersion.findMany({
    where: { agentId },
    orderBy: { createdAt: "desc" },
    include: {
      createdBy: {
        select: { firstName: true, lastName: true },
      },
    },
  });
}

// -------------------------------------------------------------
// Get a single version
// -------------------------------------------------------------

export async function getAgentVersion(
  versionId: string,
): Promise<VersionListItem | null> {
  return db.agentVersion.findUnique({
    where: { id: versionId },
    include: {
      createdBy: {
        select: { firstName: true, lastName: true },
      },
    },
  });
}

// -------------------------------------------------------------
// Rollback agent to a previous version
// -------------------------------------------------------------

export async function rollbackAgentToVersion(
  agentId: string,
  versionId: string,
): Promise<void> {
  const version = await db.agentVersion.findUnique({
    where: { id: versionId },
  });

  if (!version || version.agentId !== agentId) {
    throw new Error("Version not found");
  }

  await db.agent.update({
    where: { id: agentId },
    data: {
      version: version.version,
      description: version.description,
      longDescription: version.longDescription,
      executionEndpoint: version.executionEndpoint,
      inputSchema: version.inputSchema as Prisma.InputJsonValue,
      outputSchema: version.outputSchema as Prisma.InputJsonValue,
      pricingModel: version.pricingModel,
      priceInCents: version.priceInCents,
    },
  });
}
