# Agent Guidelines — WhatsApp Business Automation & Management Platform

Rules and conventions for AI coding agents and contributors working in this repository.

## Environment

- OS: Windows, PowerShell 5.1 (no `&&`; use `;` or `if ($?) { ... }`).
- Node.js >= 20 required. npm workspaces monorepo:
  - `apps/api` — Express + Prisma + Supabase Postgres (`@wa/api`)
  - `apps/web` — React + Vite + MUI frontend (`@wa/web`)
  - `packages/shared` — shared enums/types/enums (`@wa/shared`)
- Secrets live in `.env` / `apps/*/.env` — never commit or expose them.

## Commands

- `npm run dev` — start API (`:4000`) + web (`:5173`)
- `npm run build` — build all workspaces
- `npm run typecheck` — TypeScript checks across workspaces
- `npm run lint` — ESLint across workspaces
- `npm test` — vitest suite in `apps/api`
- `npm run db:push` — apply Prisma schema to Supabase
- `npm run db:seed` — seed demo tenants (ABC Bakery, Demo Bank)

## Code conventions

- **No comments unless necessary** — code should be self-documenting. Do not add decorative comments.
- No emojis in files unless the user explicitly asks for them.
- Keep changes scoped: edit existing files, follow existing patterns, and mirror surrounding code style.
- Use TypeScript throughout. Add types for new endpoints/shapes; prefer `@wa/shared` enums instead of string literals where shared types exist.
- Follow existing module layout in `apps/api/src/modules/<feature>/index.ts`.
- Always place new features behind auth/tenant scoping (`authenticate`, `requireRole`, `loadTenant`).
- A new component in `apps/web/src/pages|components` should follow the conventions of the existing MUI pages.
- Never commit secrets, keys, or credentials. Keep `.env` out of version control.

## Workflow

1. Read the surrounding code and existing conventions before writing.
2. Prefer small, focused changes. Verify with `npm run typecheck` and `npm run lint` before finishing.
3. Run the relevant tests (`npm test`) when behavior changes.
4. Do not commit, push, or create PRs unless the user explicitly asks.

## Daily changelog rule

- Maintain the project changelog in `CHANGELOG.md` — append only, never delete or rewrite past entries.
- Add a dated entry at **9:00 PM** or whenever the user says "add logs".
- Every entry MUST include a timestamp (`YYYY-MM-DD HH:MM`) and a proper summary of what was done.