---
phase: 4
phase_name: "navigation-departments-listing"
project: "Workforce Planning"
generated: "2026-05-28"
counts:
  decisions: 3
  lessons: 5
  patterns: 4
  surprises: 3
missing_artifacts:
  - "04-UAT.md"
---

# Phase 4 Learnings: Navigation & Departments Listing

## Decisions

### `DepartmentWithStats` extends `Department` rather than being a parallel type
`DepartmentWithStats` is declared as `interface DepartmentWithStats extends Department` in `domain.ts`, adding `headcount`, `totalFte`, and `teamCount`. The base `Department` type is unchanged.

**Rationale:** Extension keeps the type hierarchy shallow and structural. The listing page and card component always need stats; the base `Department` type is still used in edit/create contexts where stats aren't relevant. Extension avoids duplicating all base fields.
**Source:** 04-01-PLAN.md

---

### `startsWith` active-state detection for nested route navigation links
Nav links in `TopNav.tsx` use `usePathname().startsWith('/departments')` (not exact equality) to set `aria-current="page"` and active styling.

**Rationale:** The `/departments` section will have sub-pages (`/departments/[id]`). Exact equality would deactivate the nav link when navigating to a detail page, creating a disorienting UI where the active section appears deselected.
**Source:** 04-01-PLAN.md

---

### `DepartmentCard` designed as a reusable display component for downstream phases
`DepartmentCard.tsx` is a pure display component that accepts a `DepartmentWithStats` prop with no internal data fetching. The listing page drives the query; the card only renders.

**Rationale:** Phase 5 (department detail page) can import `DepartmentCard` directly for the header or summary area without re-implementing display logic. The component boundary aligns with the single-responsibility principle.
**Source:** 04-02-PLAN.md, 04-02-SUMMARY.md

---

## Lessons

### Unsafe type coercion on numeric fields from API responses can crash components
`DepartmentCard.tsx` called `.toFixed(1)` on `dept.totalFte` without a null check. If the API returns `null` or `undefined` for the field (e.g., a department with no teams), this throws `TypeError: dept.totalFte.toFixed is not a function` and crashes the card entirely.

**Context:** API responses from Azure Table Storage can omit fields when the value is falsy. TypeScript types often declare a field as `number` when the actual runtime value can be `null | undefined`. Defensive null checks before calling methods on API-sourced values are necessary even when types claim a field is non-nullable.
**Source:** 04-REVIEW.md (CR-01)

---

### Direct dictionary lookup without fallback renders `undefined` to the DOM
`TopNav.tsx` used `TYPE_LABELS[board.scenario.type]` to display a scenario type badge. If the backend returns an unknown scenario type string, this lookup produces `undefined`, which React renders as the literal text "undefined" in the DOM.

**Context:** TypeScript's `Record<K, V>` type does not protect against out-of-range key access at runtime — it's structurally sound but not runtime-safe. Any dictionary lookup on API-sourced data needs a fallback: `TYPE_LABELS[type] ?? 'Unknown'`.
**Source:** 04-REVIEW.md (CR-02)

---

### Stringified `Error` objects leak internal error structure to users
A common pattern of `throw new Error(JSON.stringify({...}))` from a hook propagated into the JSX error display as a raw JSON string visible to users (e.g., `"{"error":"Internal server error","code":500}"`). This is both a UX failure and a potential information disclosure.

**Context:** The error enrichment pattern (passing structured data through Error.message) is useful internally but must not flow directly into user-visible UI. The component rendering error states must extract a display-safe message rather than rendering the raw error string.
**Source:** 04-REVIEW.md (CR-03)

---

### Silent `.catch(() => ({}))` swallows all parse errors indiscriminately
`useDepartments.ts` used `.catch(() => ({}))` to silence JSON parse errors from DELETE responses. This converts both benign empty-body responses and genuine 5xx parse failures into an empty object, producing confusing silent failures.

**Context:** When the intent is "tolerate an empty body", the catch should at minimum log the error so it's visible in dev tools. Completely swallowing errors makes debugging network failures significantly harder.
**Source:** 04-REVIEW.md (WR-02)

---

### `suppressHydrationWarning` does not fix hydration mismatches — it hides them
`TopNav.tsx` used `suppressHydrationWarning` on the version badge span while also conditionally rendering `BUILD_TIME`-dependent content. The prop suppresses the console warning but does not prevent the mismatch, which can still cause subtle DOM inconsistency in production.

**Context:** `suppressHydrationWarning` is appropriate only for values that legitimately differ between server and client (e.g., timestamps rendered at request time). Conditional content controlled by a build-time constant should be structured so it renders identically on server and client.
**Source:** 04-REVIEW.md (WR-04)

---

## Patterns

### Null-safe method calls on API-sourced numeric fields
```typescript
{dept.totalFte != null ? dept.totalFte.toFixed(1) : '0.0'} FTE
```

**When to use:** Any time `.toFixed()`, `.toLocaleString()`, or other Number methods are called on a field sourced from an API response. Apply regardless of TypeScript's declared type — Azure Table Storage can omit fields at runtime.
**Source:** 04-REVIEW.md (CR-01)

---

### Dictionary lookup with `?? fallback` for API-sourced enum-like strings
```typescript
{TYPE_LABELS[board.scenario.type] ?? 'Unknown'}
```

**When to use:** Any `Record<string, string>` lookup where the key comes from an API response. Never assume the API will only return values that match the declared key union.
**Source:** 04-REVIEW.md (CR-02)

---

### Empty state guard: check `data?.length === 0` not `data === undefined`
```tsx
{listQuery.data?.length === 0 && <EmptyState />}
{listQuery.isLoading && <Skeleton />}
```
Checking for an empty array only after data has arrived prevents the empty state from flashing during the loading phase.

**When to use:** Any listing page that has both a loading skeleton and an empty state. These are distinct conditions and must be guarded separately.
**Source:** 04-02-SUMMARY.md, 04-VERIFICATION.md

---

### Code review as a mandatory quality gate before phase closure
Phase 4 introduced a `04-REVIEW.md` code review step after execution and before phase closure. The review identified 4 critical bugs and 4 warnings that were not caught by TypeScript or the build.

**When to use:** Every phase that introduces new UI components or data-fetching hooks. Static typing catches structural errors; code review catches runtime safety issues, UX failures, and information disclosure.
**Source:** 04-REVIEW.md

---

## Surprises

### Code review found 4 critical runtime bugs in code that passed TypeScript and build
The phase passed `tsc --noEmit` and `npm run build` cleanly. The code review then found: unsafe `.toFixed()` call (crash on null), unguarded dictionary lookup (renders "undefined"), raw Error.message exposed to users (information disclosure), and a dead code condition that could never evaluate to true.

**Impact:** Reinforces that TypeScript type safety and build success are necessary but not sufficient quality signals for UI code. Runtime null/undefined safety, fallback values, and error display must be reviewed explicitly. This is the strongest argument for making `/gsd:code-review` a standard post-execution step, not an optional one.
**Source:** 04-REVIEW.md

---

### Inline color from API applied directly to `style` attribute without CSS validation
`DepartmentCard.tsx` used `{ backgroundColor: dept.color }` as an inline style where `dept.color` is an unvalidated string from Azure Table Storage. An invalid CSS value is silently ignored by the browser, but a crafted value could potentially cause unexpected rendering.

**Impact:** Low practical risk for this app (color values are set by operators, not end users), but establishes a gap: data from storage applied to inline styles should be validated as a valid CSS color string. The fix requires a lightweight CSS color validator.
**Source:** 04-REVIEW.md (WR-03)

---

### UI/behavioral verification requires a running browser — automated checks cannot substitute
The verification report noted that loading states, card rendering order, and nav link active-state all require a running Next.js dev server and human observation. The automated verification script confirmed code structure but could not confirm visual behavior.

**Impact:** For UI phases, the verification checklist should explicitly split "automated" (grep, TypeScript, build) from "human" (browser observation) items. Marking a phase complete without the human checks creates a false sense of confidence.
**Source:** 04-VERIFICATION.md
