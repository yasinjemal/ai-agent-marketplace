# AI Rules — Coding & Architecture Standards

> **Last Updated:** 2026-02-19
> **Phase:** 1 — Foundation
> **Enforced By:** Nexus-CTO

---

## 🔒 Non-Negotiable Rules

### 1. Strict TypeScript
- `strict: true` in tsconfig.json
- **NEVER** use `any` — use `unknown` and narrow, or define proper types
- All function parameters and return types must be typed
- All API responses must have defined types

### 2. Zod Validation on Every Boundary
- API request bodies → Zod schema
- API query parameters → Zod schema
- PayFast ITN webhook payloads → Zod schema
- Agent execution payloads → Zod schema
- Form inputs → Zod schema (via react-hook-form + @hookform/resolvers)
- Environment variables → Zod schema (env.mjs)

### 3. Multi-Tenant Data Isolation
- Every database query MUST include `tenantId` in WHERE clause
- Middleware extracts and validates `tenantId` before any route handler
- No cross-tenant data leakage — ever
- Admin-only routes exempt but must be explicitly marked

### 4. Role-Based Access Control
```
ADMIN        → Full access, moderation, approval
DEVELOPER    → Agent CRUD (own agents only), analytics
BUSINESS_USER → Browse, subscribe, execute agents
```
- Checked at API route level, not just UI level
- Never trust client-side role checks alone

### 5. POPIA Compliance
- Collect minimum data necessary
- Track consent for data processing
- Support data export (right of access)
- Support data deletion (right to deletion)
- Encrypt sensitive data at rest
- Log all data access in AuditLog

### 6. Environment Variables
- Validated at startup via `src/lib/env.mjs`
- Missing required vars = application crash
- Never expose server-side vars to client (no `NEXT_PUBLIC_` prefix for secrets)
- Use `.env.local` for local development, never commit `.env`

---

## 📁 Project Structure Rules

```
src/
├── app/                    # Next.js App Router pages & layouts
│   ├── (auth)/             # Auth-related routes (sign-in, sign-up)
│   ├── (dashboard)/        # Authenticated dashboard routes
│   ├── (marketing)/        # Public marketing pages
│   ├── api/                # API route handlers
│   └── layout.tsx          # Root layout
├── components/
│   ├── ui/                 # Shadcn/UI components
│   ├── forms/              # Form components
│   ├── layout/             # Layout components (header, sidebar, footer)
│   └── shared/             # Shared/reusable components
├── lib/
│   ├── db.ts               # Prisma client singleton
│   ├── env.mjs             # Environment validation
│   ├── utils.ts            # Utility functions
│   ├── validations/        # Zod schemas
│   └── services/           # Business logic services
├── types/                  # TypeScript type definitions
├── middleware.ts            # Next.js middleware (auth + tenant)
└── constants/              # App-wide constants
```

---

## 🔧 Code Style Rules

### Naming Conventions
- **Files:** kebab-case (`agent-card.tsx`, `create-agent.ts`)
- **Components:** PascalCase (`AgentCard`, `CreateAgentForm`)
- **Functions:** camelCase (`getAgentById`, `validatePayment`)
- **Constants:** UPPER_SNAKE_CASE (`MAX_AGENTS_PER_TIER`)
- **Types/Interfaces:** PascalCase with descriptive names (`AgentCreateInput`, `SubscriptionStatus`)
- **Enums (Prisma):** UPPER_SNAKE_CASE values (`ADMIN`, `BUSINESS_USER`)

### Component Rules
- One component per file
- Props interface defined above component
- Use `React.FC` sparingly — prefer explicit return types
- Server Components by default, `"use client"` only when needed

### API Route Rules
- Always validate request body with Zod
- Always check authentication (Clerk)
- Always check authorization (role)
- Always check tenant isolation
- Return consistent error shapes:
```typescript
type ApiError = {
  success: false;
  error: {
    code: string;
    message: string;
  };
};

type ApiSuccess<T> = {
  success: true;
  data: T;
};
```

### Database Rules
- Never use raw SQL unless absolutely necessary
- Always use Prisma transactions for multi-step operations
- Always include `tenantId` in queries
- Use `select` to limit returned fields (data minimization)
- Index frequently queried columns

### Error Handling
- Try-catch all async operations
- Log errors with context (userId, tenantId, action)
- Never expose internal errors to clients
- Use custom error classes for business logic errors

---

## 🚫 Forbidden Patterns

1. ❌ `any` type anywhere
2. ❌ Unvalidated external input
3. ❌ Cross-tenant data access
4. ❌ Client-side only auth checks
5. ❌ Hardcoded secrets or API keys
6. ❌ `console.log` in production (use structured logging)
7. ❌ Inline SQL queries
8. ❌ Ignoring Prisma migration conflicts
9. ❌ Storing PII without POPIA consent
10. ❌ Skipping audit logging for sensitive operations

---

## ✅ Required Patterns

1. ✅ Zod validation on every API boundary
2. ✅ Tenant isolation on every database query
3. ✅ Role checks on every protected route
4. ✅ Audit logging for CRUD operations on sensitive data
5. ✅ Error boundaries in React components
6. ✅ Loading states for async operations
7. ✅ Mobile-first responsive design
8. ✅ Accessible components (ARIA labels, keyboard navigation)
9. ✅ Structured API error responses
10. ✅ Environment validation at startup
11. ✅ Payment verification before status completion (see rule below)

---

## 💳 Payment Integrity Rule (Non-Negotiable)

> Added: 2026-02-19 | Relates to: D016

### Rule
No payment may be marked as `COMPLETED` unless `isVerified = true`.

### How It Works
1. PayFast sends an ITN webhook to our `/api/webhooks/payfast` endpoint.
2. Our server **verifies** the ITN by:
   a. Validating the signature against our `PAYFAST_PASSPHRASE`.
   b. Confirming the payload with PayFast's validation endpoint (`https://www.payfast.co.za/eng/query/validate`).
   c. Checking that `merchant_id` matches our `PAYFAST_MERCHANT_ID`.
   d. Checking that `amount_gross` matches the expected subscription amount.
3. Only after ALL checks pass → set `isVerified = true`.
4. Only after `isVerified = true` → set `status = COMPLETED`.
5. The subscription status is only updated to `ACTIVE` after a verified, completed payment.

### Forbidden
- ❌ Setting `status = COMPLETED` without `isVerified = true`
- ❌ Trusting webhook payload without server-side verification
- ❌ Updating subscription status based on unverified payments
- ❌ Skipping signature validation in any environment (including dev)

### Code Enforcement
```typescript
// In the PayFast ITN handler:
if (!isVerified) {
  throw new Error("PAYMENT_NOT_VERIFIED: Cannot complete unverified payment");
}

// In any payment update service:
function completePayment(paymentId: string) {
  const payment = await db.payment.findUniqueOrThrow({ where: { id: paymentId } });
  if (!payment.isVerified) {
    throw new Error("INTEGRITY_VIOLATION: Cannot complete unverified payment");
  }
  // ... proceed with status update
}
```

### Audit
Every payment verification attempt (pass or fail) must be logged in the AuditLog with:
- `action: PAYMENT`
- `entityType: "Payment"`
- `metadata: { verified: boolean, payfastPaymentId, reason }`
