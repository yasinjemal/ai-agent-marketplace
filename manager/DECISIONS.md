# Technical Decisions Log

> **Last Updated:** 2026-02-21
> **Phase:** 5 — Agent Execution Engine

---

## Decision Format

Each decision follows:
- **Decision:** What was decided
- **Rationale:** Why
- **Alternatives Considered:** What else we looked at
- **Status:** Active / Superseded / Under Review

---

## D001 — Framework: Next.js (App Router)

- **Decision:** Use Next.js with App Router, TypeScript, and `src/` directory
- **Rationale:** Full-stack framework with SSR/SSG, API routes, middleware support. App Router is the future of Next.js with React Server Components. Deploys natively to Vercel.
- **Alternatives Considered:** Remix (smaller ecosystem), SvelteKit (smaller talent pool), Express + React (more complexity)
- **Status:** ✅ Active

## D002 — Database: PostgreSQL + Prisma ORM

- **Decision:** PostgreSQL as primary database with Prisma ORM in strict TypeScript mode
- **Rationale:** PostgreSQL is production-grade, supports JSON columns for agent schemas, excellent multi-tenant support. Prisma provides type-safe queries and easy migrations.
- **Alternatives Considered:** MongoDB (schema flexibility but weaker relations), Supabase (vendor lock-in), Drizzle (newer, less mature)
- **Status:** ✅ Active

## D003 — Authentication: Clerk

- **Decision:** Use Clerk for authentication and user management
- **Rationale:** Handles auth complexity (MFA, SSO, user management UI). Provides middleware for Next.js. Supports organizations (maps to tenants). Reduces time-to-market.
- **Alternatives Considered:** NextAuth (more DIY), Auth0 (expensive at scale), Supabase Auth (tied to Supabase)
- **Status:** ✅ Active

## D004 — Payments: PayFast (Primary)

- **Decision:** PayFast as primary payment processor with Stripe as optional fallback
- **Rationale:** PayFast is the leading SA payment gateway. Supports ZAR natively, EFT, credit card, and SnapScan. SA businesses trust it. ITN webhooks for subscription lifecycle.
- **Alternatives Considered:** Stripe (limited ZAR support, not well-known in SA), Paystack (growing but smaller), Yoco (primarily POS)
- **Status:** ✅ Active

## D005 — UI: Tailwind CSS + Shadcn/UI

- **Decision:** Tailwind CSS for styling, Shadcn/UI for component library, Lucide for icons
- **Rationale:** Tailwind enables rapid mobile-first development. Shadcn/UI provides accessible, customizable components that own their code (not a dependency). Lucide is the icon set Shadcn uses.
- **Alternatives Considered:** Material UI (heavy, opinionated), Chakra UI (runtime CSS-in-JS), Radix only (no styling)
- **Status:** ✅ Active

## D006 — Multi-Tenancy: Tenant ID Foreign Key Model

- **Decision:** All business data tables include a `tenantId` foreign key. Middleware enforces tenant isolation.
- **Rationale:** Simpler than schema-per-tenant. Works with Prisma. Scales with connection pooling. Enforced at middleware + query level.
- **Alternatives Considered:** Schema-per-tenant (complex migrations), Row-level security (PostgreSQL-specific, harder to debug), Database-per-tenant (expensive)
- **Status:** ✅ Active

## D007 — Validation: Zod Everywhere

- **Decision:** Zod for ALL external input validation — API requests, webhooks, forms, env vars
- **Rationale:** Runtime type safety. Integrates with TypeScript. Works with React Hook Form. Prevents invalid data from reaching business logic. Single validation library reduces cognitive load.
- **Alternatives Considered:** Joi (no TS inference), Yup (weaker TS support), io-ts (steeper learning curve)
- **Status:** ✅ Active

## D008 — Hosting: Vercel

- **Decision:** Deploy to Vercel
- **Rationale:** Native Next.js support. Edge functions for middleware. Automatic preview deployments. Good free tier for MVP. Scales automatically.
- **Alternatives Considered:** AWS (overkill for MVP), Railway (less Next.js optimization), Netlify (weaker Next.js support)
- **Status:** ✅ Active

## D009 — Currency: ZAR Default

- **Decision:** All prices stored and displayed in ZAR (South African Rand)
- **Rationale:** Target market is South African SMEs. Removes currency conversion confusion. PayFast operates in ZAR natively.
- **Alternatives Considered:** Multi-currency (premature complexity), USD (wrong market)
- **Status:** ✅ Active

## D010 — Agent Architecture: External HTTP Services

- **Decision:** AI agents are external HTTP services called via their `executionEndpoint`
- **Rationale:** Decouples agent logic from marketplace. Developers can use any language/framework. Marketplace is an orchestration layer, not an execution environment. Reduces security surface.
- **Alternatives Considered:** Embedded execution (security nightmare), Serverless functions (vendor lock-in), Docker containers (operational complexity)
- **Status:** ✅ Active

## D011 — Environment Validation: Crash-on-Missing

- **Decision:** Application crashes at startup if any required environment variable is missing (validated via Zod in `env.mjs`)
- **Rationale:** Fail-fast prevents silent misconfigurations reaching production. Better to crash at deploy than serve broken responses.
- **Status:** ✅ Active

## D012 — Role-Based Access: Three Roles

- **Decision:** Three roles — Admin, Developer, Business User — enforced via middleware and API checks
- **Rationale:** Minimum viable authorization. Admin moderates. Developer creates agents. Business User consumes agents. Maps cleanly to the marketplace model.
- **Status:** ✅ Active

## D013 — POPIA Compliance: Built-In

- **Decision:** POPIA compliance is a non-negotiable architectural requirement, not a feature
- **Rationale:** South African law. Violations carry fines up to R10M. Tenant data isolation, consent tracking, data minimization, and right-to-deletion must be built into every feature.
- **Status:** ✅ Active (Non-negotiable)

## D014 — User Identity & Multi-Tenant Email Strategy

- **Decision:** Remove global `@unique` from `email` on the User model. Replace with composite `@@unique([tenantId, email])`. Keep `clerkId @unique` as the global identity anchor.
- **Rationale:** In a multi-tenant SaaS, the same person (e.g., a consultant or developer) may legitimately need accounts under multiple tenants. A globally unique email blocks this entirely. The fix:
  - `clerkId` remains globally unique — this is the **identity** (one Clerk account per person).
  - `email` is unique **per tenant** — prevents duplicate accounts within the same business, but allows the same email across different tenants.
  - This matches how Clerk Organizations work: one user identity, multiple org memberships.
- **Alternatives Considered:** Keeping global unique (blocks legitimate multi-tenant use), email as non-unique entirely (allows duplicate users within same tenant — dangerous)
- **Status:** ✅ Active

## D015 — Agent Composite Index: developerId + status

- **Decision:** Add composite index `@@index([developerId, status])` to the Agent model.
- **Rationale:** Two critical queries hit this pattern constantly:
  1. **Developer dashboard:** "Show me all MY agents filtered by status" → `WHERE developerId = ? AND status = ?`
  2. **Admin moderation queue:** "Show all agents pending review" → `WHERE status = 'PENDING_REVIEW'` (covered by existing status index, but the composite helps when filtering by developer too)
  - Without a composite index, PostgreSQL must scan the `developerId` index and then filter by status in memory. The composite index serves both columns in a single B-tree lookup.
- **Status:** ✅ Active

## D016 — Payment Verification Flag (isVerified)

- **Decision:** Add `isVerified Boolean @default(false)` to the Payment model. A payment's `status` may only be set to `COMPLETED` when `isVerified = true`.
- **Rationale:** PayFast ITN (Instant Transaction Notification) webhooks must be **server-side verified** against PayFast's validation endpoint before trusting the payment. Without this flag:
  - A spoofed webhook could set a payment to COMPLETED.
  - The `isVerified` field acts as a server-verified proof-of-payment separate from the status lifecycle.
  - Business rule: `status = COMPLETED` requires `isVerified = true`. Code must enforce this invariant.
- **Alternatives Considered:** Relying on status alone (no verification proof), storing verification result in metadata JSON (not queryable, easy to miss)
- **Status:** ✅ Active

## D017 — Prisma v7: Datasource URL in prisma.config.ts (Not schema.prisma)

- **Decision:** The `datasource` block in `schema.prisma` contains **only** `provider = "postgresql"`. The connection URL lives in `prisma.config.ts` via `datasource.url: process.env["DATABASE_URL"]`.
- **Rationale:** Prisma v7 (our installed version: 7.4.1) removed support for `url = env("DATABASE_URL")` inside `schema.prisma`. Adding it back causes validation error P1012. This is a **breaking change from Prisma v6 → v7**. The `prisma.config.ts` file was auto-generated by `prisma init` and already contains the correct `DATABASE_URL` reference with dotenv loading.
- **Proof:** Running `npx prisma validate` with `url` in schema → `P1012 error`. Without it → `✅ valid`.
- **Alternatives Considered:** Downgrading to Prisma v6 (loses v7 features), using `prisma+postgres` protocol (vendor lock-in to Prisma Accelerate)
- **Status:** ✅ Active (Prisma v7 requirement)

## D018 — Subscription Composite Index: tenantId + status

- **Decision:** Add composite index `@@index([tenantId, status])` to the Subscription model.
- **Rationale:** The most common subscription query pattern is: "Get the active subscription for this tenant" → `WHERE tenantId = ? AND status = 'ACTIVE'`. The composite index serves this in a single B-tree lookup instead of scanning all subscriptions for a tenant and then filtering by status. Critical as the subscription table grows.
- **Status:** ✅ Active

## D019 — Clerk Auth with Onboarding-First Pattern

- **Decision:** Use Clerk's `clerkMiddleware()` for route protection, with a mandatory onboarding flow for new sign-ups. User + Tenant records are created during onboarding (not in the Clerk webhook). Clerk `publicMetadata` stores `onboardingComplete`, `role`, `tenantId`, and `dbUserId`.
- **Rationale:** The webhook `user.created` fires before the user has chosen their business name and role. By deferring DB record creation to the `/onboarding` route, we guarantee every user has a Tenant and Role before accessing protected routes. Middleware checks `metadata.onboardingComplete` and redirects incomplete users.
- **Alternatives Considered:** Creating user+tenant in webhook (no role/business name available), using Clerk organizations (overkill for single-tenant SMEs), using Clerk custom flow (more complex).
- **Status:** ✅ Active

## D020 — Clerk Session Claims for Role-Based Middleware

- **Decision:** Store user role in Clerk `publicMetadata` and read it via `sessionClaims.metadata` in middleware for route gating. API routes use `auth()` → DB lookup via `clerkId` for authoritative role checks.
- **Rationale:** Middleware needs to be fast (runs on every request). Reading `publicMetadata` from the JWT avoids a DB call per request. API routes still do the full DB lookup for authorization decisions, ensuring the database remains the source of truth.
- **Alternatives Considered:** DB lookup in middleware (too slow), JWT custom claims via Clerk session tokens (more complex setup), client-only role checks (insecure).
- **Status:** ✅ Active

## D021 — Svix Webhook Verification with Dev Fallback

- **Decision:** The Clerk webhook endpoint uses Svix signature verification when `CLERK_WEBHOOK_SECRET` is set. In development without the secret, it falls back to raw JSON parsing with a console warning.
- **Rationale:** Development/testing flow shouldn't be blocked by webhook secret configuration. Production deployments MUST set the secret. The fallback is gated behind the secret being empty.
- **Alternatives Considered:** Always requiring the secret (blocks dev), no verification at all (insecure), using ngrok for local webhook testing (complex setup).
- **Status:** ✅ Active

## D022 — PayFast Custom Integration (Not SDK)

- **Decision:** Build PayFast integration from scratch using their REST API rather than relying on a community NPM package.
- **Rationale:** No official PayFast Node.js SDK exists. Community packages are unmaintained. The integration surface is small: MD5 signature generation, URL-encoded form POST for checkout, ITN webhook handling. Custom code is simpler, auditable, and has zero dependency risk.
- **Alternatives Considered:** `payfast-js` npm package (unmaintained, last updated 2022), `payfast-common` (incomplete).
- **Status:** ✅ Active

## D023 — PayFast Subscription Billing via Recurring API

- **Decision:** Use PayFast's subscription_type=1 (subscription) with frequency=3 (monthly) and cycles=0 (indefinite) for all paid plans. Free plan has no PayFast interaction.
- **Rationale:** PayFast handles recurring charge scheduling, card tokenization, and retry logic. We only need to handle the initial checkout redirect and listen to ITN webhooks for payment events. This eliminates the need to build a billing scheduler.
- **Alternatives Considered:** Manual monthly charges via ad-hoc payments (complex scheduling), annual-only billing (limits flexibility), token-based charging with manual scheduling (more responsibility).
- **Status:** ✅ Active

## D024 — PayFast ITN 4-Step Verification

- **Decision:** Every ITN webhook goes through 4 security checks: (1) MD5 signature verification, (2) source IP logging, (3) payment amount comparison with R0.01 tolerance, (4) server-to-server validation POST to PayFast (production only).
- **Rationale:** PayFast recommends all 4 steps in their ITN documentation. Skipping any step could allow forged payment confirmations. The R0.01 tolerance handles floating-point rounding. Server validation is skipped in sandbox because PayFast sandbox validation endpoint is unreliable.
- **Alternatives Considered:** Signature-only verification (insufficient per PayFast docs), IP whitelist enforcement (PayFast IPs can change).
- **Status:** ✅ Active

## D025 — PayFast Custom Fields for Tenant Context

- **Decision:** Pass `tenantId`, `userId`, and `planId` via PayFast's `custom_str1`, `custom_str2`, and `custom_str3` fields. These are echoed back in the ITN webhook payload.
- **Rationale:** PayFast has no native concept of tenants or plans. The custom string fields (max 255 chars each) allow us to map a PayFast transaction back to our data model without maintaining a separate checkout session table. The `m_payment_id` field carries our Prisma Payment record ID for direct lookup.
- **Alternatives Considered:** Session table with checkout tokens (extra DB table + cleanup logic), encoding all data in m_payment_id (too fragile), using custom_int fields (limited to integers).
- **Status:** ✅ Active

## D026 — Subscription Lifecycle State Machine

- **Decision:** Subscriptions follow a strict state machine: TRIAL → ACTIVE → CANCELED/PAST_DUE/EXPIRED. State transitions are managed exclusively through the subscription service layer, never via direct DB updates.
- **Rationale:** Centralizing state transitions ensures audit logs are always created, tenant plan fields are always updated in sync, and invalid transitions (e.g., CANCELED → ACTIVE) are prevented. Every transition triggers an audit log entry for POPIA compliance.
- **Alternatives Considered:** Direct Prisma updates in API routes (no audit trail), event-driven state machine (overengineered for current scale).
- **Status:** ✅ Active

## D027 — Plan Limits Enforced in Subscription Service

- **Decision:** Agent creation limits are checked via `canAddAgent()` in the subscription service, which compares current PUBLISHED agent count against the plan's `maxAgents` limit.
- **Rationale:** Centralizing the check in the service layer means both the API route and any future execution engine can enforce limits consistently. Only PUBLISHED agents count toward the limit (draft agents don't consume quota).
- **Alternatives Considered:** Middleware-level enforcement (too coarse), database trigger (opaque, hard to test), client-only validation (insecure).
- **Status:** ✅ Active

## D028 — Payment Amount Stored in Cents (ZAR)

- **Decision:** All monetary amounts are stored as integers in cents (e.g., R299.00 → 29900). PayFast communicates in Rands (decimal), so conversion happens at the service boundary.
- **Rationale:** Integer arithmetic avoids floating-point rounding errors in commission calculations and amount comparisons. The `priceInCents` and `commissionInCents` fields in the schema are BigInt-compatible. Display formatting uses `(amount / 100).toFixed(2)`.
- **Alternatives Considered:** Storing as Decimal (Prisma Decimal type adds complexity), storing as Rands (float rounding issues in JS).
- **Status:** ✅ Active

## D029 — Agent Execution via External HTTP POST

- **Decision:** Execute agents by sending a POST request to their `executionEndpoint` with JSON body. The marketplace acts as an orchestration layer — it never runs agent code directly.
- **Rationale:** Implements D010 (agents as external HTTP services). The service sends `Content-Type: application/json`, expects JSON back. This decouples the marketplace from agent internals — developers can use any language, framework, or hosting. The `X-Marketplace-Request: true` header allows agents to identify marketplace-originated requests.
- **Alternatives Considered:** gRPC (requires proto files, more complex), WebSocket (unnecessary for request-response), GraphQL (overkill per-agent).
- **Status:** ✅ Active

## D030 — Execution Retry Strategy: Exponential Backoff

- **Decision:** Failed agent calls are retried up to 2 times with exponential backoff (1s, 2s). Only transient errors are retried: HTTP 408, 429, 500, 502, 503, 504, network failures, and timeouts.
- **Rationale:** External agents are unreliable — they may have cold starts, rate limits, or transient failures. Retrying with backoff handles these gracefully. Non-retryable errors (400, 401, 403, 404) fail immediately since retrying won't help. The 30-second default timeout prevents hung connections.
- **Alternatives Considered:** No retries (poor UX for transient failures), circuit breaker only (premature complexity), queue-based retry (requires Redis/job system).
- **Status:** ✅ Active

## D031 — In-Memory Sliding-Window Rate Limiter

- **Decision:** Rate limiting uses an in-memory sliding-window algorithm keyed by `tenantId`. Limits are per-plan: Free (5/min, 50/day), Starter (15/min, 500/day), Growth (30/min, 2000/day), Enterprise (100/min, 10000/day).
- **Rationale:** In-memory rate limiting is simple, zero-dependency, and fast. For a single-process deployment on Vercel, this is sufficient. The sliding-window approach is more accurate than fixed-window (no burst at window boundaries). A cleanup timer runs every 5 minutes to prevent memory leaks. Production note: replace with Redis when scaling to multiple instances.
- **Alternatives Considered:** Redis-based (requires infrastructure), database-based (too slow for per-request checks), fixed-window (allows bursts at boundaries).
- **Status:** ✅ Active (single-instance; upgrade to Redis at scale)

## D032 — Execution Logging: Full Payload Capture

- **Decision:** Every execution records full input payload, output payload, status, duration, HTTP status code, cost, and error message in the `AgentExecution` table. Failed executions record the error but are not charged.
- **Rationale:** Full payload capture enables debugging, dispute resolution, and POPIA audit compliance. Storing input/output as JSON means no schema changes when agents evolve. Error messages are truncated to 1000 characters to prevent storage abuse. The `completedAt` timestamp paired with `createdAt` provides precise duration tracking independent of clock drift.
- **Alternatives Considered:** Log-only (no queryable history), summary-only (loses debugging context), external log service (adds dependency).
- **Status:** ✅ Active

## D033 — Usage Metering: Per-Execution Cost Model

- **Decision:** Agents with `PER_EXECUTION` pricing charge `priceInCents` per successful execution. `FREE` agents cost 0. `MONTHLY_FLAT` and `TIERED` agents are covered by the subscription fee — no per-execution charge. Failed/timed-out executions are never charged.
- **Rationale:** Simple, transparent pricing. Business users know exactly what each execution costs. Not charging for failures prevents disputes and builds trust. The `costInCents` field on each execution record creates a clear audit trail for billing. Monthly stats are aggregated via `getExecutionStats()` for the billing dashboard.
- **Alternatives Considered:** Always-charge model (unfair for failures), credit-based system (complex), post-hoc billing (delayed feedback).
- **Status:** ✅ Active

## D034 — Subscription Gating for Execution

- **Decision:** Agent execution requires an active subscription (status = ACTIVE or TRIAL). The execute API checks `getCurrentSubscription()` and rejects with 403 if no active subscription exists. The tenant's `planId` determines rate limits.
- **Rationale:** Execution is the primary value action — it must be gated behind a subscription to drive conversions. Allowing TRIAL users to execute ensures they experience value before paying. The plan lookup happens once per request (not per retry) to minimize DB calls.
- **Alternatives Considered:** No subscription check (no monetization gate), middleware-level check (too coarse — not all API routes need subscription), separate API key system (premature complexity).
- **Status:** ✅ Active