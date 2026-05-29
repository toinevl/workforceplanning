@AGENTS.md

# Workforce Planning

A Next.js app for HR/managers to model team reorganizations — create scenarios, drag members between teams, compare snapshots, and apply changes. Backed by Azure Table Storage.

## Dev setup

```bash
# Terminal 1 — local Azure Storage emulator
npm run azurite

# Terminal 2 — Next.js dev server
npm run dev

# Or both at once:
npm run dev:full
```

Open http://localhost:3000. Seed sample data after first launch:

```bash
npm run dev:seed
```

Copy `.env.local.example` to `.env.local` for local overrides (defaults work out of the box with Azurite).

## Key commands

| Command | Purpose |
|---|---|
| `npm run dev` | Dev server (port 3000) |
| `npm run dev:full` | Azurite + dev server together |
| `npm run dev:seed` | Seed sample data |
| `npm run type-check` | TypeScript check |
| `npm run lint` | ESLint |
| `npm run build` | Production build |

## Tech stack

- **Next.js 16** App Router — server components by default, client only when needed
- **TypeScript** strict mode — `@/*` alias maps to `src/*`
- **Tailwind CSS v4** — no config file (CSS-based config); use `tailwind-merge` + `clsx` for conditional classes
- **Azure Table Storage** — sole persistence layer (`@azure/data-tables`); Azurite emulates it locally
- **TanStack Query** — server-state caching; **Zustand** for client-only UI state
- **dnd-kit** — drag-and-drop for team member reordering

## Conventions

- Always use the `@/` import alias (e.g. `@/lib/types/domain`)
- No `any` — use proper types or `unknown`
- Prefer server components; add `'use client'` only for event handlers, hooks, or browser APIs
- API routes: `src/app/api/` — hooks: `src/lib/hooks/` — domain types: `src/lib/types/domain.ts`
- No comments unless the WHY is non-obvious
