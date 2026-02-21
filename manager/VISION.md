# AI Agent Marketplace South Africa — Vision Document

> **Last Updated:** 2026-02-19
> **Phase:** 1 — Foundation
> **Owner:** Yasin (Founder) + Nexus-CTO (AI Technical Co-Founder)

---

## 🎯 Mission

Make AI automation affordable and accessible for every South African SME — from spaza shops to restaurants to online sellers — through a subscription-based marketplace of ready-to-use AI agents.

---

## 🌍 Market Opportunity

### Target Customers
- **Retail businesses** — inventory, pricing, customer engagement
- **Restaurants** — order management, menu optimization, reviews
- **Service businesses** — scheduling, invoicing, customer follow-ups
- **Online sellers** — product listings, customer support, marketing

### Market Size
- 2.6M+ registered SMEs in South Africa
- Growing digital adoption post-COVID
- Limited affordable AI solutions targeting SA market specifically
- ZAR-denominated pricing removes currency friction

### Why Now
- AI costs dropping rapidly
- SA businesses are hungry for automation
- No dominant local AI marketplace exists
- POPIA compliance creates a moat against lazy foreign competitors

---

## 💰 Revenue Model

### Primary: Monthly Subscriptions (MRR-First)
| Tier       | Price (ZAR) | Agents | Features                        |
|------------|-------------|--------|---------------------------------|
| Free Trial | R0          | 2      | 7-day trial, basic agents       |
| Starter    | R299/mo     | 5      | Core agents, email support      |
| Growth     | R799/mo     | 15     | All agents, priority support    |
| Enterprise | Custom      | ∞      | Custom agents, SLA, dedicated   |

### Secondary: Developer Revenue Share
- Developers list agents on the marketplace
- Platform takes 20% commission on agent subscriptions
- Developers earn 80% of subscription revenue from their agents

### Tertiary: Enterprise Integrations
- Custom agent development
- API access fees
- White-label solutions

---

## 📊 Key Performance Indicators (KPIs)

| KPI                    | Target (Month 6) | Target (Month 12) |
|------------------------|-------------------|--------------------|
| MRR                    | R50,000           | R250,000           |
| Active Paying Businesses| 100               | 400                |
| Agent Adoption Rate    | 3 agents/business | 5 agents/business  |
| Conversion Rate        | 8%                | 12%                |
| Churn Rate             | < 8%              | < 5%               |
| CAC                    | < R200            | < R150             |
| LTV                    | > R2,400          | > R4,800           |

---

## 🏗️ Product Vision

### Phase 1: Foundation (Current)
- Project scaffold, database schema, auth, environment config
- Multi-tenant architecture with strict data isolation

### Phase 2: Core Marketplace
- Agent CRUD for developers
- Admin approval workflow
- Agent browsing for businesses

### Phase 3: Auth + Multi-Tenancy
- Clerk integration with role-based access
- Tenant isolation enforcement
- Onboarding flows

### Phase 4: Subscriptions + Payments
- PayFast integration (ZAR)
- Subscription lifecycle management
- ITN webhook verification

### Phase 5: Agent Execution Engine
- External HTTP agent execution
- Execution logging & metering
- Error handling & retries

### Phase 6: Growth Engine
- Analytics dashboard
- Referral system
- Usage metering
- Ratings & reviews

---

## 🛡️ Competitive Moat

1. **Local-first** — ZAR pricing, POPIA compliant, SA-optimized
2. **Multi-tenant** — True data isolation, not just row-level filtering
3. **Developer ecosystem** — Revenue share attracts agent developers
4. **Affordable** — Priced for SA SMEs, not Silicon Valley budgets
5. **Compliance** — POPIA built-in from day one, not bolted on

---

## 🚀 Success Criteria (Month 12)

- [ ] R250,000 MRR
- [ ] 400+ active paying businesses
- [ ] 50+ approved agents on marketplace
- [ ] 20+ active agent developers
- [ ] < 5% monthly churn
- [ ] Zero POPIA compliance incidents
