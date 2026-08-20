# Product Roadmap — WhatsApp Business Automation & Management Platform

> **One engine. Unlimited business workflows.**

## Current Status

Foundation / MVP scaffold — **DONE** ✅ (multi-tenant, dashboard, database, mock webhook)

## Phase 1 — FOUNDATION ✅ DONE

- [x] Monorepo (`apps/api`, `apps/web`, `packages/shared`)
- [x] Auth + RBAC (Platform Admin / Business Admin / Agent), JWT access + refresh
- [x] Multi-tenant (businesses) with full data isolation
- [x] Customers / Conversations / Messages inbox
- [x] Agent Takeover / Resume / Resolve
- [x] Data-driven Menus
- [x] Workflow builder (Trigger → Message → Menu → Handoff)
- [x] Generic Entities / Records (Product, Order)
- [x] WhatsApp templates
- [x] Analytics (overview + trend) + Audit log
- [x] WhatsApp webhook (verify handshake + inbound ingest; signature optional in dev)
- [x] Seed data: ABC Bakery + Demo Bank (5 users)
- [x] Smoke tests: health, auth, tenant isolation

## Phase 2 — REAL WHATSAPP GATEWAY (NEXT)

- [x] Production-ready `ProviderAdapter` (`send`, `sendText`, `sendTemplate`, `sendInteractive`, `sendMedia`, `markAsRead`, `getMessageStatus`)
- [x] Meta (`WhatsAppProvider`) implementation behind the adapter — no Meta-specific code leaking into core
- [x] Dev `MockProvider` fallback when no token/number configured
- [x] `markAsRead` on inbound webhook (best-effort); provider send failure marks message `FAILED` + returns 502
- [ ] Connect a real WhatsApp Business number (Meta Developer App → WABA → Phone Number → Webhook)
- [ ] E2E test: customer sends "Hi" → system replies "Welcome 👋"

## Phase 3 — CONVERSATION RUNTIME (highest priority)

- [ ] Conversation state machine: `status`, `currentWorkflowId`, `currentNodeId`, `variables`, `automationStatus`, `lastMessageAt`
- [ ] Workflow execution engine — resume on customer input (e.g. WAITING_FOR_INPUT → find MenuItem → next node)
- [ ] Idempotent webhook/event handling

## Phase 4 — GENERIC WORKFLOW ENGINE

- [ ] Node types: `TRIGGER`, `MESSAGE`, `MENU`, `INPUT`, `CONDITION`, `ACTION`, `HUMAN_HANDOFF`, `END`
- [ ] Config-driven flows only — no hardcoded business logic

## Phase 5 — GENERIC ACTION ENGINE

- [ ] `CREATE_RECORD` / `UPDATE_RECORD` / `READ_RECORD` driven by entity config (Order, Appointment, ServiceRequest, …)
- [ ] Same engine, different entity configuration per business type

## Phase 6 — API CONNECTORS / EXTERNAL SERVICES

- [ ] External API call node (ERP, CRM, payments, booking, banking, e-commerce)
- [ ] Response consumed back into the workflow and replied via WhatsApp

## Phase 7 — HUMAN SUPPORT SYSTEM

- [ ] Assignment, team queues, internal notes, agent availability, priority, tags, SLA
- [ ] Unread counts, search, filters, conversation locking

## Phase 8 — QUEUE + SCHEDULER (Redis + BullMQ)

- [ ] Delayed / follow-up messages (e.g. order created → wait 24h → follow-up)
- [ ] Appointment reminders (e.g. 24h before)
- [ ] Add Redis only after the workflow runtime is clearly defined

## Phase 9 — AUTOMATION RULES

- [ ] Event-driven rules separate from workflows (e.g. `Order Created` + `paymentStatus = pending` → send template)
- [ ] Scheduled reminders / follow-ups

## Phase 10 — AI LAYER (intelligence, not source of truth)

- [ ] AI intent detection → deterministic workflow routing
- [ ] AI acts as a router only (`intent = ORDER_STATUS` → workflow → approved response)

## Phase 11 — ANALYTICS + BILLING

- [ ] Message funnel (sent / delivered / read / failed)
- [ ] Automation effectiveness (workflow executions, completed / failed / abandoned)
- [ ] Automation Rate metric: `(conversations auto-resolved ÷ total conversations) × 100`
- [ ] Billing

## Phase 12 — ONBOARDING + INDUSTRY TEMPLATES

- [ ] Business setup wizard (details → connect WhatsApp → configure fields → menu → workflow → agents → test → activate)
- [ ] Industry templates (Bakery, Restaurant, Salon, Clinic, Education, Banking, Real Estate, Retail, Service Business) — all config over the same generic engine

## Validation Milestones

- [ ] **Vertical slice — ABC Bakery:** "Hi" → webhook → conversation → Welcome Workflow → Menu → "1. View Products" → Products → "Chocolate Cake" → Quantity → Confirm → Create Order (record) → Confirmation — **all config-driven, zero hardcoded bakery logic**
- [ ] **Same engine, Demo Bank:** "Hi" → Bank Menu → Account → Balance → Authentication → Balance Response
- [ ] If both run on the same runtime: the generic architecture is proven

## Testing Strategy (before AI / campaigns)

- [ ] Tenant isolation (Tenant A can never access Tenant B)
- [ ] Workflow execution (Node A → Node B → Node C)
- [ ] State persistence (message → WAIT → message → resume correct node)
- [ ] Webhook idempotency (duplicate webhook → one message, not two)
- [ ] Human handoff (automation paused; agent responds; automation stays out of the way)