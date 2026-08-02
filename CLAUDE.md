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

For the full seed pipeline (CLI → API → logic, custom team configs, options reference), see [docs/seed-scripting.md](docs/seed-scripting.md).

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

## Azure Resource Hygiene

When migrating, replacing, or changing Azure infrastructure (hosting model,
storage, function apps, key vaults, plans), decommissioning the OLD resource
is part of Done — in the same PR/session.

- Before migration: `az resource list --resource-group <RG> -o table` (save it)
- After migration: diff against pre-flight inventory. Anything unreferenced = orphan.
- Delete orphans in dependency order (apps before plans, consumers before providers).
- If multiple agents created resources, do a full RG audit before assuming clean.
- "I'll clean it up later" = the root cause of every orphaned resource. Delete now.

See skill: `tvv-azure-resource-hygiene`

## Conventions

- Always use the `@/` import alias (e.g. `@/lib/types/domain`)
- No `any` — use proper types or `unknown`
- Prefer server components; add `'use client'` only for event handlers, hooks, or browser APIs
- API routes: `src/app/api/` — hooks: `src/lib/hooks/` — domain types: `src/lib/types/domain.ts`
- No comments unless the WHY is non-obvious

## No Dead Components

A component that compiles, passes lint and type-check, but is never
imported anywhere is dead code. It creates false confidence — "the feature
exists, it just needs wiring up" — and the wiring never happens because
nothing flags the gap.

**Rule:** When creating or finishing a UI component, wire it into a page
in the same commit. If it's not imported by any page or parent component,
it's not done — it's dead. `eslint` with `no-unused-vars` won't catch
this because the export IS used (by the export statement). The only way
to catch it is to check: does any file import this?

Quick check for dead exports:

```bash
for f in $(find src/components -name '*.tsx'); do
  name=$(grep -oP 'export\s+(?:function|const)\s+\K\w+' "$f")
  [ -n "$name" ] && ! grep -rq "import.*\b$name\b" src/ --include='*.tsx' --include='*.ts' \
    --exclude="$(basename $f)" && echo "DEAD: $name ← $f"
done
```
