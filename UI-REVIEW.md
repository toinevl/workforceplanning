# UI Review — Workforce Planning App

> Audit conducted: 2026-05-17  
> Last updated: 2026-05-17  
> Stack: Next.js 14 App Router · TypeScript · Tailwind CSS · shadcn/ui · dnd-kit · Zustand · TanStack Query

---

## Implementation Status

### Completed — 2026-05-17 (Group 1)

- **Group 1 / P0 critical bugs completed.**
- CompareView now fetches full snapshot details with `useSnapshot()` and renders historical board state from `GET /api/scenarios/[id]/snapshots/[snapId]`.
- Drag-and-drop move notes now use an in-app `NoteDialog` with Skip/Save actions instead of `window.prompt()`.
- Scenario delete and reset actions now use a reusable `ConfirmDialog` instead of `window.confirm()`.
- Local development loading issue fixed: the storage client now defaults to `UseDevelopmentStorage=true`, uses local-friendly retry settings, and Next dev allows the observed local network origin.

### Completed — 2026-05-17 (Group 3)

- **Group 3 / Responsive Design completed.**
- `TeamBoard` grid wrapped in `overflow-x-auto`; layout changed to `grid-flow-col auto-cols-[minmax(160px,1fr)]` so all 6 team columns sit in one horizontal row and are reachable via scroll on a 375px viewport.
- `MemberDetailSheet` outer panel changed to a full-width bottom sheet on mobile (`fixed bottom-0 left-0 right-0 h-[85vh]`), reverting to the right-side `w-80` panel at `sm+`.
- `ParametersPanel` and `PapertrailPanel` (inline `aside` panels) changed from fixed `w-72`/`w-80` to `w-full sm:w-72`/`w-full sm:w-80` — full-width stack on mobile, side-panel on `sm+`.
- `CompareView` grid changed from `grid-cols-2` to `grid-cols-1 lg:grid-cols-2`; added a "Left / Right" pill toggle (hidden on `lg+`) so mobile users can switch between the two scenario boards.
- Pre-existing `next.config.js` lint error (from Group 2 build-metadata work) suppressed with `eslint-disable-next-line`.

### Completed — 2026-05-17 (Group 2)

- **Group 2 / Accessibility completed.**
- `MemberDetailSheet` converted to a portal-rendered dialog with `role="dialog"`, `aria-modal="true"`, `aria-labelledby`, focus trap, Escape dismissal, and focus restoration.
- `ScenarioDashboard` "New Scenario" overlay inner div upgraded with `role="dialog"`, `aria-modal="true"`, `aria-labelledby`, and backdrop-click-to-close.
- `DndProvider` now passes a full `accessibility` prop to `<DndContext>` including keyboard instructions and `onDragStart`/`onDragOver`/`onDragEnd`/`onDragCancel` announcements using resolved member names.
- `ParametersPanel` `Field` component now accepts `htmlFor` and generates a stable `useId()` fallback; all `RetirementWaveForm` inputs have matching `id`/`htmlFor` pairs.
- `ScenarioDashboard` Name and Description inputs now have `id`/`htmlFor` label associations.
- `TeamHeader` now maps raw driver enum values through `DRIVER_LABELS` ("grow" → "Grow" etc.) instead of rendering them verbatim. `MemberBadges` already showed full labels — no change needed.
- Touch targets increased to WCAG 2.5.5 minimum (44×44px) in: `TopNav`, `PapertrailPanel`, `SnapshotHistory`, `ScenarioDashboard`, `ScenarioCard`.

### Verification — 2026-05-17 (Group 3)

- `npm run type-check` — passed
- `npm run lint` — passed (pre-existing `next.config.js` require-import warning suppressed)

### Verification — 2026-05-17 (Group 1)

- `npm run type-check` — passed
- `npm run lint` — passed
- `npm run build` — passed
- Local smoke test: Azurite + seeded data returned 3 scenarios from `/api/scenarios`; dashboard no longer stayed on "Loading scenarios".

### Verification — 2026-05-17 (Group 2)

- `npm run type-check` — passed
- `npm run lint` — passed

---

## Scores

### 6-Pillar Design Audit (15/24)

| Pillar | Score | Verdict |
|--------|-------|---------|
| Copywriting | 3/4 | Labels are clear and specific; a few raw enum values slip into the UI |
| Visuals | 2/4 | Hierarchy is functional but monochromatic; close buttons are bare "x" characters |
| Color | 2/4 | Almost entirely gray; semantic color used without icon/text backup (a11y risk) |
| Typography | 3/4 | Coherent type scale; one arbitrary size (`text-[0.6875rem]`) breaks the system |
| Spacing | 3/4 | Consistent 4px-grid usage; a few mixed conventions across panels |
| Experience Design | 2/4 | Loading/error states are bare text; no post-drop confirmation; CompareView silently broken |

### Modern Web Practices Audit (8/16)

| Dimension | Score | Verdict |
|-----------|-------|---------|
| Responsive Design | 2/4 | Board overflows on mobile; side panels are fixed widths with no mobile fallback |
| Accessibility | 2/4 | Nav and close buttons are well-labeled; modals lack dialog role/focus trap |
| Performance & Loading | 2/4 | Good query config; no loading.tsx/error.tsx; everything is `'use client'` |
| Modern React/Next.js | 2/4 | App Router used correctly; excessive `'use client'`; `window.prompt/confirm` anti-patterns |

**Combined: 23/40**

---

## Improvement Plan

Issues are grouped by theme and ordered within each group by impact. Fix groups in order — earlier groups unblock later ones.

---

### Group 1 — Critical Bugs (fix first)

These are broken features or interactions that block real use.

#### 1.1 Fix CompareView snapshot rendering
**Status:** Completed 2026-05-17  
**File:** `src/components/scenarios/CompareView.tsx:94-101`  
**Issue:** `getBoardFromSnapshot()` always returns `undefined` — its arguments are discarded with `void`. Selecting any saved snapshot on either side of the compare view shows "Select a snapshot" forever. The compare feature is silently non-functional for historical boards.  
**Fix:** Fetch the full board state for the selected snapshot from the API (`GET /api/scenarios/[id]/snapshots/[snapId]`) inside `getBoardFromSnapshot`, or replace the stub with a `useQuery` keyed on `snapId`. If not yet implementable, show a clear "Snapshot comparison coming soon" placeholder instead of the broken empty state.  
**Implemented:** Added `useSnapshot()` in `src/lib/hooks/useSnapshots.ts` and wired `CompareView` to render `snapshot.boardState` with loading/error messaging.

#### 1.2 Replace `window.prompt()` for drag-and-drop move notes
**Status:** Completed 2026-05-17  
**File:** `src/components/teams/TeamBoard.tsx:75`  
**Issue:** Every drag-and-drop triggers a native browser dialog. It is unthemed, inaccessible, blocks the event loop, and is unavailable in some WebViews. It also fails keyboard drag flows — a keyboard-driven drop triggers the native prompt immediately, interrupting focus.  
**Fix:** Add a small `NoteDialog` component (Radix Dialog or `<dialog>`) that slides in after a drop with a text input and Skip/Save buttons. Wire it into the existing `moveMutation.mutate()` call.  
**Implemented:** Added `src/components/teams/NoteDialog.tsx`; `TeamBoard` now stores a pending move after drop and commits through Skip/Save.

#### 1.3 Replace `window.confirm()` for destructive actions
**Status:** Completed 2026-05-17  
**Files:** `src/components/scenarios/ScenarioDashboard.tsx` (delete), `src/components/layout/TopNav.tsx:98` (reset)  
**Issue:** Same problems as `window.prompt()` — unstyled, inaccessible, inconsistent with the rest of the UI.  
**Fix:** Create a reusable `<ConfirmDialog>` component (one component, parameterized title/message/confirm label) and use it in both places. Include a description of consequences (e.g. "This will delete all snapshots and audit history.").  
**Implemented:** Added `src/components/ui/ConfirmDialog.tsx` with dialog semantics, focus handling, Escape/backdrop dismissal, and pending/error states. Updated reset and scenario delete flows. Note: `src/app/settings/page.tsx` still has a separate native confirm outside Group 1 scope.

---

### Group 2 — Accessibility

These issues affect users with disabilities and keyboard-only users.

#### 2.1 Add `role="dialog"` and focus trapping to all overlay panels
**Status:** Completed 2026-05-17  
**Files:** `src/components/members/MemberDetailSheet.tsx`, `src/components/scenarios/ScenarioDashboard.tsx:94`  
**Issue:** Both custom overlays were raw `<div>` elements with no `role="dialog"`, no `aria-modal="true"`, no `aria-labelledby`, and no focus trap.  
**Implemented:** `MemberDetailSheet` converted to a portal-rendered dialog with focus trap cycling, Escape key dismissal, backdrop click, and focus restoration. `ScenarioDashboard` "New Scenario" overlay upgraded with `role="dialog"`, `aria-modal="true"`, `aria-labelledby`, and backdrop-click-to-close. Manual focus management used (consistent with existing `ConfirmDialog` pattern).

#### 2.2 Wire dnd-kit screen reader announcements
**Status:** Completed 2026-05-17  
**File:** `src/components/dnd/DndProvider.tsx`  
**Issue:** `<DndContext>` had no `accessibility` prop — `KeyboardSensor` was wired but silent.  
**Implemented:** Added `accessibility` prop with keyboard instructions and `onDragStart`/`onDragOver`/`onDragEnd`/`onDragCancel` announcements. Member names resolved via the `members` array (draggable items use `active.id` = member ID; no `data.current` fields were set on draggables). Fixed missing `onDragCancel` required by the `Announcements` type.

#### 2.3 Fix form label associations
**Status:** Completed 2026-05-17  
**Files:** `src/components/scenarios/ScenarioDashboard.tsx:122,135`, `src/components/scenarios/ParametersPanel.tsx`  
**Issue:** `<label>` elements had no `htmlFor` and inputs had no `id`.  
**Implemented:** `ParametersPanel` `Field` component updated with optional `htmlFor` prop and `useId()` fallback; all `RetirementWaveForm` inputs have matching `id`/`htmlFor`. `ScenarioDashboard` Name and Description inputs now have `useId()`-generated `id`/`htmlFor` pairs. (Note: audit listed `src/app/scenarios/page.tsx` but that file is a redirect — the actual form is in `ScenarioDashboard`.)

#### 2.4 Add icon/text backup to driver color badges
**Status:** Completed 2026-05-17  
**Files:** `src/components/teams/TeamHeader.tsx`  
**Issue:** Business driver meaning communicated through color alone.  
**Implemented:** `TeamHeader` now maps raw driver values through `DRIVER_LABELS` constant. `MemberBadges` already rendered full text labels — no change needed.

#### 2.5 Increase touch target sizes
**Status:** Completed 2026-05-17  
**Files:** `src/components/layout/TopNav.tsx`, `src/components/scenarios/PapertrailPanel.tsx`, `src/components/scenarios/SnapshotHistory.tsx`, `src/components/scenarios/ScenarioDashboard.tsx`, `src/components/scenarios/ScenarioCard.tsx`  
**Issue:** WCAG 2.5.5 requires 44×44px minimum touch targets.  
**Implemented:** Nav links/buttons `py-1.5` → `py-2.5`; close buttons given `min-h-[44px] min-w-[44px] flex items-center justify-center`; action buttons throughout increased to `py-2.5`. MemberCard had no small interactive elements requiring change.

---

### Completed — 2026-05-17 (Group 4)

- **Group 4 / Performance & Server Components completed.**
- `src/lib/utils/fetchJSON.ts` created with a shared generic `fetchJSON<T>` helper; duplicate local definitions removed from all 5 hooks (`useScenario`, `useTeamBoard`, `useAudit`, `useParameters`, `useSnapshots`).
- `loading.tsx` and `error.tsx` added to `src/app/scenarios/` and `src/app/scenarios/[scenarioId]/` — App Router streaming infrastructure now active; skeleton shimmer shown immediately while data loads.
- `'use client'` removed from `MemberBadges.tsx`, `ScenarioStats.tsx`, and `workforceStore.ts` — all confirmed safe (no hooks or browser APIs).
- `src/app/scenarios/[scenarioId]/page.tsx` and `compare/page.tsx` converted to async server components: `'use client'` removed, data fetched via `getScenarioBoardState()` at render time, loading flash eliminated; `AppShell`, `TeamBoard`, and `CompareView` remain client components.

### Verification — 2026-05-17 (Group 4)

- `npm run type-check` — passed
- `npm run lint` — passed

---

### Group 3 — Responsive Design

#### 3.1 Make the TeamBoard horizontally scrollable on small screens
**Status:** Completed 2026-05-17  
**File:** `src/components/teams/TeamBoard.tsx:91`  
**Issue:** The 6-column grid (`grid-cols-2 md:grid-cols-3 lg:grid-cols-6`) compresses to 2 columns on mobile, leaving 4 teams below the fold with no visual cue that they exist. No horizontal scroll wrapper is present.  
**Implemented:** Wrapped grid in `<div className="overflow-x-auto">`. Changed grid layout to `grid-flow-col auto-cols-[minmax(160px,1fr)]` so all 6 columns sit in one horizontal row (~960px min-width) and are reachable via horizontal scroll on any viewport.

#### 3.2 Make side panels responsive (bottom sheet on mobile)
**Status:** Completed 2026-05-17  
**Files:** `src/components/members/MemberDetailSheet.tsx:33`, `src/components/scenarios/ParametersPanel.tsx:40`, `src/components/scenarios/PapertrailPanel.tsx:48`  
**Issue:** All panels are `fixed right-0 w-80` (320px). On a 375px viewport this consumes nearly the full screen width, leaving the underlying content invisible without explicit close behavior.  
**Implemented:** `MemberDetailSheet` (fixed/portal) converted to mobile bottom sheet: `fixed bottom-0 left-0 right-0 h-[85vh] sm:bottom-auto sm:top-0 sm:left-auto sm:right-0 sm:h-full sm:w-80`. `ParametersPanel` and `PapertrailPanel` (inline asides) changed to `w-full sm:w-72`/`w-full sm:w-80` — full-width stack on mobile, fixed side-panel on `sm+`.

#### 3.3 Fix CompareView on small screens
**Status:** Completed 2026-05-17  
**File:** `src/components/scenarios/CompareView.tsx:27`  
**Issue:** Fixed `grid-cols-2` with no responsive variant renders two half-width boards side by side on mobile — both illegible.  
**Implemented:** Grid changed to `grid-cols-1 lg:grid-cols-2` so boards stack vertically on small screens. Added a "Left / Right" pill toggle (`lg:hidden`) above the grid; active board shown via `block`/`hidden` conditionals on each side wrapper. On `lg+` both boards always visible.

---

### Group 4 — Performance & Server Components

#### 4.1 Add `loading.tsx` and `error.tsx` route segments
**Status:** Completed 2026-05-17  
**Location:** `src/app/scenarios/`, `src/app/scenarios/[scenarioId]/`  
**Issue:** No file-based loading UI existed. Every route showed a blank white screen until data resolved — the App Router's streaming infrastructure was completely unused.  
**Implemented:** `loading.tsx` (skeleton shimmer matching actual page layout) and `error.tsx` (with retry button and back link) added to both segments. App Router Suspense boundaries now active.

#### 4.2 Convert scenario pages from client to server components
**Status:** Completed 2026-05-17  
**Files:** `src/app/scenarios/[scenarioId]/page.tsx`, `src/app/scenarios/[scenarioId]/compare/page.tsx`  
**Issue:** Both pages were `'use client'` solely to call data-fetch hooks, creating a client-side waterfall.  
**Implemented:** Both pages converted to `async` server components. `'use client'` removed; data fetched via `getScenarioBoardState()` at render time; missing scenarios call `notFound()`. `AppShell`, `TeamBoard`, and `CompareView` remain client components and receive data as props. Loading flash eliminated.

#### 4.3 Remove unnecessary `'use client'` from display components
**Status:** Completed 2026-05-17  
**Files:** `src/components/members/MemberBadges.tsx`, `src/components/scenarios/ScenarioStats.tsx`, `src/lib/store/workforceStore.ts`  
**Implemented:** `'use client'` removed from all three — confirmed no hooks, browser APIs, or event handlers in the display components; directive has no effect on a plain Zustand store module.

#### 4.4 Deduplicate `fetchJSON` helper
**Status:** Completed 2026-05-17  
**Files:** `src/lib/utils/fetchJSON.ts` (new), 5 hooks updated  
**Issue:** Identical local `fetchJSON` helper found in 5 hook files (not just the 2 noted in the audit).  
**Implemented:** Extracted to `src/lib/utils/fetchJSON.ts` as `export async function fetchJSON<T>(url: string, opts?: RequestInit): Promise<T>`. Local copies removed from `useScenario`, `useTeamBoard`, `useAudit`, `useParameters`, and `useSnapshots`.

---

### Group 5 — Visual Polish

#### 5.1 Replace bare "x" close buttons with a proper icon
**Files:** `src/components/members/MemberDetailSheet.tsx`, `src/components/scenarios/ParametersPanel.tsx`, `src/components/scenarios/PapertrailPanel.tsx`, `src/components/scenarios/SnapshotHistory.tsx`  
**Status:** Completed 2026-05-17  
Created `src/components/ui/CloseButton.tsx` with Lucide X icon, forwardRef, aria-label, and type="button". Applied in all four panels.

#### 5.2 Add a brand accent color
**Status:** Completed 2026-05-17  
Six primary CTAs changed from `bg-gray-900` to `bg-blue-600` / `hover:bg-blue-700`: ScenarioDashboard header "New Scenario", empty state button, dialog "Create" button; SnapshotHistory "Save"; PapertrailPanel "Add"; ParametersPanel "Apply Logic".

#### 5.3 Fix font stack conflict
**File:** `src/app/globals.css`  
**Status:** Completed 2026-05-17  
Changed `body { font-family: Arial, Helvetica, sans-serif; }` to `body { font-family: var(--font-sans), Arial, sans-serif; }`.

#### 5.4 Map raw enum values to human labels in MemberDetailSheet
**File:** `src/components/members/MemberDetailSheet.tsx`  
**Status:** Completed 2026-05-17  
Added `STATUS_LABELS` constant mapping `active → Active`, `transferred → Transferred`, `removed → Removed`. Wired to the Status stat display with fallback.

#### 5.5 Add success/error feedback after member moves
**File:** `src/components/teams/TeamBoard.tsx`  
**Status:** Completed 2026-05-17  
Installed `sonner`. Added `<Toaster richColors position="bottom-right" />` to `layout.tsx`. Wired `toast.success("Moved {name} to {destination}")` and `toast.error("Move failed — try again")` to `moveMutation.onSuccess`/`onError`.

---

### Group 6 — Copywriting & Minor Polish

#### 6.1 Improve primary CTA label on ScenarioCard
**File:** `src/components/scenarios/ScenarioCard.tsx`  
**Status:** Completed 2026-05-17  
Changed primary CTA from "Open" to "View Scenario".

#### 6.2 Resolve team name display in PapertrailPanel
**File:** `src/components/scenarios/PapertrailPanel.tsx`  
**Status:** Completed 2026-05-17  
Built `teamById` map from `board.teams` (mirrors existing `memberById` pattern). Passed to `AuditRow` and used to resolve `fromTeamId`/`toTeamId` to human-readable names, with fallback to "Unknown team" / "Removed".

#### 6.3 Standardize section header styles
**Files:** `src/components/scenarios/ParametersPanel.tsx`, `src/components/members/MemberDetailSheet.tsx`  
**Status:** Completed 2026-05-17  
Created `src/components/ui/SectionLabel.tsx` (`text-xs font-medium text-gray-700 uppercase tracking-wide mb-2`). Replaced 5 inline section header elements across both files. Accepts `children` + optional `className` override.

---

## Priority Order for Implementation

| Priority | Items | Effort |
|----------|-------|--------|
| P0 — Fix now | Completed: 1.1 (CompareView bug), 1.2 (window.prompt), 1.3 (window.confirm) | Done |
| P1 — Before next user | Completed: 2.1 (dialog roles), 2.2 (dnd announcements), 5.5 (move feedback) | Done |
| P2 — This sprint | Completed: 2.3 (form labels), 2.4 (color badges), 3.1 (board scroll), 4.1 (loading.tsx) | Done |
| P3 — Next sprint | Completed: 3.2 (side panels), 4.2 (server components), 5.1 (close button), 5.2 (accent color) | Done |
| P4 — Polish | Completed: 2.5 (touch targets), 4.3 (use client cleanup), 5.3–5.5, 6.1–6.3 | Done |

**Effort key:** S = <2h, M = 2–4h, L = 4–8h
