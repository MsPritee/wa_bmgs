# Changelog

Daily development log. Append-only — past entries are never deleted or rewritten. Add entries at 9:00 PM daily or when asked to "add logs".

---

## 2026-08-20 22:01

**Initial project day — Foundation/MVP scaffold**

- Initialized npm workspaces monorepo: `apps/api` (Express + Prisma + Supabase Postgres), `apps/web` (React + Vite + MUI), `packages/shared` (shared enums/types).
- Wired root scripts: `dev`, `build`, `typecheck`, `lint`, `test`, `db:push`, `db:seed` via `concurrently`.
- **API (`@wa/api`)**
  - Auth module: login / refresh / logout / me / change-password with bcrypt + JWT access (`15m`) and refresh (`30d`) tokens, refresh-token rotation with hashed, revoked tokens.
  - RBAC: `PLATFORM_ADMIN`, `BUSINESS_ADMIN`, `AGENT` with `authenticate`, `requireRole`, `loadTenant` middleware.
  - Multi-tenant model: tenants module (platform-admin CRUD, business profile `/tenants/me`), full tenant-scoped data isolation.
  - Modules: customers, conversations (takeover/resume/resolve), messages, menus, workflows, entities/records (generic business data), templates, agents, analytics (overview + trend), audit log.
  - WhatsApp module: public webhook with verify handshake + inbound message ingest (signature verification optional in dev via `WHATSAPP_APP_SECRET`).
  - Hardening: helmet, CORS, express-rate-limit (300 req/min), JSON body size limit with `rawBody` capture for webhook signatures, central error/404 handlers.
- **Shared (`@wa/shared`)**: exported enums (`Role`, `MenuAction`, `EntityFieldType`, `WorkflowNodeType`, `ConversationStatus/Mode`, etc.).
- **Web (`@wa/web`)**
  - React + Vite + MUI + React Router + TanStack Query + Zustand.
  - Auth store with token persistence; protected routes; login page.
  - Pages: Dashboard (KPIs + trend chart), Conversations (inbox + detail with send/takeover/resume/resolve), Customers, Menus, Workflows, Business Data (entities/records), Templates, Agents, Settings.
  - API client with typed endpoints and 401 auto-logout.
- **Database / seed**
  - Prisma schema (users, tenants, customers, conversations, messages, menus/menu items, workflows/nodes, entities/fields/records, templates, agents, refresh tokens, webhook events).
  - Seed: demo tenants ABC Bakery + Demo Bank with 5 accounts:
    - `admin@platform.test / Admin@1234` (Platform Admin)
    - `baker@bakery.test / Baker@1234` (Bakery Admin)
    - `agent@bakery.test / Agent@1234` (Bakery Agent)
    - `bank.admin@bank.test / Bank@1234` (Bank Admin)
    - `support@bank.test / Support@1234` (Bank Support)
- Tests: vitest smoke suite (health, auth failures, RBAC 403, tenant isolation).
- Docs: added `AGENTS.md` (agent rules + changelog rule) and `ROADMAP.md` (Phase 1 Foundation done; Phases 2–12 planned).

## 2026-08-20 22:02

**Project docs & roadmap**

- Created `ROADMAP.md` at repo root — product roadmap with Phase 1 (Foundation) marked DONE; Phases 2–12 planned (WhatsApp gateway, conversation runtime, workflow/action engines, API connectors, human support, queue+scheduler, automation rules, AI layer, analytics+billing, onboarding/industry templates), plus validation milestones and testing strategy.
- Created `AGENTS.md` — coding-agent rules: environment (Win/PowerShell 5.1), commands, code conventions (self-documenting code, no decorative comments, TypeScript, auth/tenant scoping), and the append-only daily changelog rule (entry at 9:00 PM or on "add logs").
- Created `CHANGELOG.md` — append-only daily development log with timestamped entries.