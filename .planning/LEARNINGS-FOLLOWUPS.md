# Phase Learnings → Actionable Follow-Ups

Consolidated from v2.0 per-phase learnings (01–05), the retrospective, and the
2026-06-28 drone findings. Each item is mapped to a concrete action and a
wishlist item (existing or proposed).

## Already resolved

| Learning | Resolution | Wishlist |
|----------|-----------|----------|
| OData filter injection in `deleteDepartment` (P5-T03) | UUID validation (`assertValidId`) wired into data layer | #0 ✅ |
| Unvalidated color in inline CSS (P5-E01) | Hex color validation at API routes + client form | #0 ✅ |
| `entityToTeam` mapper missing `departmentId` | Fixed in Phase 3; mapper exhaustiveness pattern documented | — |
| API contract mismatch (`departmentId` vs `defaultDepartmentId`) | Fixed in Phase 3; raw-fetch pattern documented | — |
| Missing `PATCH /api/teams/[id]` route | Created in Phase 3 | — |
| Stale `.claude/worktrees/` lint leakage | Worktrees removed, `.claude/worktrees/` gitignored | #0 ✅ |

## Actionable follow-ups (mapped to wishlist)

### 1. Error body extraction must not leak to user-visible UI

**Source:** Phase 4 CR-03, Phase 3 error-enrichment pattern
**Problem:** The `throw new Error(JSON.stringify({...}))` pattern threads
structured data through TanStack Query's error channel. At least one component
rendered the raw `error.message` (JSON string) directly into the DOM — both a
UX failure and potential information disclosure.
**Action:** Audit all error-display components; ensure they extract a
display-safe message, not the raw Error string.
**Wishlist:** #1 (load/error/empty states)

### 2. Silent `.catch(() => ({}))` swallows genuine errors

**Source:** Phase 4 WR-02, drone findings (db/client.ts:38-52)
**Problem:** Multiple places use `.catch(() => ({}))` or bare `catch {}` to
tolerate empty/missing responses. This silently swallows genuine 5xx parse
failures and infra errors, making debugging significantly harder.
**Action:** Replace bare catches with conditional logging; at minimum
`console.warn` the error in dev. Audit `db/client.ts`, `useDepartments.ts`,
and the `getDepartmentById` catch block.
**Wishlist:** #4 (Table Storage query path audit) — proposed scope expansion

### 3. Mapper exhaustiveness type check

**Source:** Phase 3 lesson (entityToTeam missing departmentId)
**Problem:** TypeScript does not enforce that a mapper function returns every
domain field. Fields can be silently dropped at the entity→domain boundary.
**Action:** Add a compile-time exhaustiveness check using
`satisfies` or a type-level test that verifies the mapper return type covers
all keys of the domain type.
**Wishlist:** proposed new item (code quality)

### 4. Content-Security-Policy header

**Source:** Drone findings (P5-E01 follow-up)
**Problem:** No CSP header restricts `style-src`. While the color validation
fix closes the immediate injection vector, a CSP header is defense-in-depth.
**Action:** Add a `Content-Security-Policy` response header to API routes
or via `next.config.js` headers. Restrict `style-src` to `'self'` and
`'unsafe-inline'` (Tailwind requires inline styles).
**Wishlist:** proposed new item (security)

### 5. `suppressHydrationWarning` misuse

**Source:** Phase 4 WR-04
**Problem:** `TopNav.tsx` uses `suppressHydrationWarning` on a build-time
version badge. The prop hides the mismatch but doesn't prevent DOM
inconsistency in production.
**Action:** Restructure the version badge so it renders identically on server
and client (e.g., render only after mount via `useEffect` + state).
**Wishlist:** #1 (load/error/empty states) — proposed scope inclusion

### 6. Node LTS exact pinning

**Source:** Drone findings, Azure rebuild plan
**Problem:** Node version is `~22` (approximate) in CI and runtime. Exact LTS
pinning prevents surprise breakage from minor-version drift.
**Action:** Pin exact Node LTS version in `ci.yml`, `deploy.yml`, and
App Service `nodeVersion` setting.
**Wishlist:** #5 / #9 (Azure rebuild / Standard tier)

## Proposed new wishlist items

Based on the above, these don't have a tracking item yet:

| Proposed item | Tags | Source |
|---------------|------|--------|
| Mapper exhaustiveness type check | +code-quality | Phase 3 |
| Content-Security-Policy header | +security | Drone findings |
| Seed/scripting standardization doc | +docs | Drone findings |
| Architecture Decision Records (ADR) | +docs | Drone findings |

## Patterns to carry forward (no action needed)

These are documented best practices that are already followed — no follow-up
required, just reinforcement for future work:

- **Raw fetch for error-enriched responses** — use `fetch()` not `fetchJSON`
  when the endpoint carries structured data in error bodies (409 counts).
- **Null-safe method calls on API numerics** — guard `.toFixed()` etc. with
  `!= null` even when TypeScript says the field is non-nullable.
- **Dictionary lookup with fallback** — `TYPE_LABELS[type] ?? 'Unknown'` for
  all `Record` lookups on API-sourced keys.
- **Empty state vs loading state** — check `data?.length === 0` (not
  `data === undefined`) to avoid flashing empty state during load.
- **Mutation invalidation** — always `invalidateQueries` on the parent list
  key after a mutation; don't manually patch cache.
- **`startsWith` for nested nav active state** — catches both listing and
  detail pages under the same section.
- **Custom dialog for complex modal content** — don't widen shared dialog
  interfaces; build one-off dialogs with matching visual conventions.
