# Goal Planner — Design Spec

Date: 2026-05-05

## Overview

A dedicated "Goal Planner" page that lets a workforce planner define outcome goals and constraint guardrails, then automatically generates draft scenarios that achieve those goals. Generation uses a two-phase hybrid approach: a TypeScript constraint solver enumerates valid solutions, then Claude selects and explains the best 1–3 proposals. Each accepted proposal is saved as a draft scenario in the existing scenario list for further manual refinement.

---

## Goals & Scope

**In scope:**
- `/planner` page with goals, guardrails, and generation-mode configuration
- "Goal Planner" nav link between Scenarios and Settings
- Algorithm phase: bounded depth-first search producing feasible move sequences
- AI phase: Claude ranks and annotates top solutions
- Results view: proposals shown inline on the page; user picks one or more to save as scenarios
- Three generation modes: best recommendation, multiple alternatives (up to 3), step-by-step review

**Out of scope:**
- Persisting planner configuration (goals/guardrails are session-only for now)
- Scheduling or recurring goal checks
- Editing generated scenarios within the Goal Planner itself (use the scenario board for that)

---

## New Route & Navigation

- **Page:** `src/app/planner/page.tsx`
- **Nav:** Add "✦ Goal Planner" to `TopNav` between Scenarios and Settings
- **Color:** Purple accent (`text-purple-400` active, matches generation UI)

---

## Data Model

### Goals

```ts
type GoalType = 'squad_removal' | 'fte_reduction' | 'team_rebalance';

interface Goal {
  id: string;
  type: GoalType;
  // squad_removal: no extra params (removes all isSquad members)
  // fte_reduction: targetDelta (negative number, e.g. -2.0)
  // team_rebalance: teamId + targetHeadcount
  params: Record<string, unknown>;
  label: string; // human-readable description
}
```

### Guardrails

```ts
type GuardrailType =
  | 'min_team_size'     // minimum headcount for all teams or a named team
  | 'max_team_size'     // maximum headcount
  | 'target_team_size'  // exact target headcount per team
  | 'movement_restriction' // specific member IDs that cannot be reassigned
  | 'skill_coverage';   // minimum count of a role/tag per team

interface Guardrail {
  id: string;
  type: GuardrailType;
  params: Record<string, unknown>;
  label: string;
}
```

Goals and guardrails are held in React state on the planner page (not persisted to Azure). A future version can persist them as a `plannerConfigs` table.

### Generation mode

```ts
type GenerationMode = 'best' | 'alternatives' | 'step_by_step';
```

### Proposal (output of the pipeline)

```ts
interface Proposal {
  id: string;
  moves: ProposedMove[];
  rationale: string;        // AI-written plain-English explanation
  tradeoffs?: string;       // AI-flagged risks or compromises
  score: number;            // algorithm heuristic score (lower = better)
}

interface ProposedMove {
  memberId: string;
  memberName: string;
  fromTeamId: string | null;
  toTeamId: string | null;   // null = remove from all teams
  action: 'reassign' | 'remove';
}
```

---

## UI: Goal Planner Page

Two-column layout (same max-width as the scenario dashboard):

**Left column (2/3 width):**
- **Goals panel** — list of configured goals with add/remove. Pre-populated with common goal templates (squad removal, FTE reduction). Each goal shows its type label and a short description.
- **Guardrails panel** — list of configured guardrails with add/remove. Displayed with amber styling to signal "constraints". Each guardrail shows its type and effect.

**Right column (1/3 width):**
- **Generation mode selector** — radio group: Best recommendation / Multiple alternatives / Step-by-step review
- **Generate button** — triggers the pipeline; shows loading state ("Generating… ~5–10s")
- **Info note** — "Generated scenarios are saved as drafts. Refine them on the board."

**Results area** (below the two columns, full width, shown after generation):
- For "best" mode: one proposal card with move list + AI rationale
- For "alternatives" mode: up to 3 proposal cards side-by-side
- For "step-by-step" mode: moves listed one at a time with Accept / Skip per move; a summary card is built as the user works through the list
- Each proposal card has a "Save as Scenario" button that creates the draft and navigates to it

---

## Generation Pipeline

### API route

`POST /api/planner/generate`

**Request body:**
```ts
{
  goals: Goal[];
  guardrails: Guardrail[];
  mode: GenerationMode;
}
```

**Response:**
```ts
{
  proposals: Proposal[];  // 1 for "best", up to 3 for "alternatives" / "step_by_step"
}
```

### Phase 1 — Constraint Solver (`src/lib/planner/solver.ts`)

1. Load current staff and teams from Azure Table Storage.
2. Build the initial world state: which members are on which teams, each member's FTE.
3. Enumerate candidate moves:
   - Remove: any active member not blocked by a movement-restriction guardrail
   - Reassign: any active member not blocked, to any team other than their current one
4. Filter moves that immediately violate guardrails (e.g., reassigning would drop the source team below min size).
5. Run a bounded DFS, applying moves one at a time, checking guardrails after each step. Prune branches that violate any guardrail. Stop a branch when all goals are satisfied.
6. Cap at **20 complete solutions** to bound runtime. Solutions exceeding the cap are discarded.
7. Score each solution: `score = numMoves * 10 + teamSizeVariance`. Lower is better (fewest moves, most even distribution).
8. Return the top 10 scored solutions to phase 2.

### Phase 2 — AI Ranker (`src/lib/planner/ranker.ts`)

Calls Claude (`claude-sonnet-4-6`) with a structured prompt containing:
- Summary of current org state (team names, headcounts, total FTE)
- Goals and guardrails in plain English
- The top 10 solutions, each as a numbered list of moves

Asks Claude to:
1. Select the best 1 solution (mode: `best`) or 1–3 solutions (modes: `alternatives`, `step_by_step`)
2. For each selected solution, write a 2–3 sentence rationale explaining why it's a good choice
3. Flag any notable trade-offs or risks

Response parsed as JSON (`Proposal[]`). Uses `tool_use` / structured output to avoid parsing fragile prose.

### Scenario creation

`POST /api/planner/create-scenario`

**Request body:**
```ts
{
  proposal: Proposal;
  name: string;
  description?: string;
}
```

Creates a new scenario of type `ai_generated`, then writes a `ScenarioMemberState` row **only for members affected by the proposal's moves** (reassigned or removed). Members not mentioned in the proposal have no explicit row; the board reads their base-team state as normal. Redirects to the new scenario's board page.

---

## New Scenario Type

The existing `ScenarioType` is `'squad_removal' | 'retirement_wave' | 'business_drivers'`. AI-generated scenarios need a type.

**Decision:** Add `'ai_generated'` as a fourth `ScenarioType`. Display label: "AI Generated". Badge color: purple. This allows the scenario board to label the origin clearly and could later support goal-replay (re-running the planner against an existing generated scenario).

Update `TYPE_LABELS` and `TYPE_COLORS` in `ScenarioCard.tsx` and anywhere else `ScenarioType` is consumed.

---

## Step-by-Step Mode Detail

In step-by-step mode the results area renders one proposed move at a time:

```
Move 1 of 6: Move Alice Chen  SQUAD → Team Alpha
[Accept]  [Skip]
```

Accepted moves accumulate into a local proposal. After the last move (or when the user clicks "Done"), the accumulated moves are shown as a summary card with a "Save as Scenario" button. Skipped moves are not included. The AI rationale shown at the end covers the accepted subset only (re-requested from the API with the final move list, or omitted in v1 if cost is a concern).

---

## Open Questions

1. **`ai_generated` scenario type:** should it be a fourth type or should generated scenarios adopt the type closest to their primary goal (e.g., `squad_removal` if that was the main goal)?  Recommendation: add `ai_generated` — keeps provenance clear.

2. **Step-by-step rationale:** re-request AI rationale for the accepted subset, or skip it in v1? Recommendation: skip in v1, add a note "rationale reflects the full proposal."

3. **Guardrail UI for movement restrictions:** how does the planner specify which members can't move? Options: (a) pick members by name from a searchable list, (b) pick by tag/role, (c) inherit from member `notes` field. Recommendation: searchable member list in v1.

4. **Solver performance:** DFS with 56 members and complex guardrails could be slow. If initial testing shows >10s, add a greedy pre-filter: sort candidate moves by score contribution and only DFS the top 30.

---

## Files Touched / Created

| Path | Change |
|------|--------|
| `src/app/planner/page.tsx` | New page |
| `src/components/planner/GoalPanel.tsx` | Goals list + add/edit |
| `src/components/planner/GuardrailPanel.tsx` | Guardrails list + add/edit |
| `src/components/planner/GenerationModeSelector.tsx` | Radio group |
| `src/components/planner/ProposalCard.tsx` | Displays one proposal |
| `src/components/planner/StepByStepReview.tsx` | Step-by-step mode UI |
| `src/lib/planner/solver.ts` | Phase 1: constraint solver |
| `src/lib/planner/ranker.ts` | Phase 2: Claude API call |
| `src/lib/types/planner.ts` | Goal, Guardrail, Proposal types |
| `src/app/api/planner/generate/route.ts` | POST endpoint |
| `src/app/api/planner/create-scenario/route.ts` | POST endpoint |
| `src/components/layout/TopNav.tsx` | Add Goal Planner nav link |
| `src/lib/types/domain.ts` | Add `ai_generated` to `ScenarioType` |
| `src/components/scenarios/ScenarioCard.tsx` | Add label/color for `ai_generated` |
