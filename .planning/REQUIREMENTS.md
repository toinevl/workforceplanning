# Requirements: Workforce Planning v2.0

**Defined:** 2026-05-18
**Core Value:** A planner can open a scenario, see their full team structure, and quickly model "what if" staffing changes without touching production HR data.

## v2.0 Requirements

### Hardening

- [ ] **HARD-01**: Seed `resetFirst` operation is blocked on production environments (non-`UseDevelopmentStorage` connection string or `NODE_ENV === 'production'`)
- [ ] **HARD-02**: `entityToTeam()` mapper is consolidated to a single shared location so schema changes propagate to all consumers (board state, team listings)
- [ ] **HARD-03**: Department migration is idempotent — running it twice does not create duplicate departments (sentinel row pattern)

### Department Entity

- [ ] **DEPT-01**: User can create a department with name, color, description, and department head
- [ ] **DEPT-02**: User can edit an existing department's name, color, description, and department head
- [ ] **DEPT-03**: User can delete a department only when no teams are assigned to it
- [ ] **DEPT-04**: User sees a count of assigned teams when attempting to delete a department with teams (blocked deletion with clear feedback)
- [ ] **DEPT-05**: Departments table is initialized in Azure Table Storage on app startup alongside existing tables

### Team-to-Department Assignment

- [ ] **ASSIGN-01**: User can assign a team to a department via a dropdown on the team edit form in Settings
- [ ] **ASSIGN-02**: Teams without a department assignment appear in an "Unassigned" bucket on the departments listing page
- [ ] **ASSIGN-03**: User can bulk-assign all unassigned teams to a selected department via a one-time migration action in Settings
- [ ] **ASSIGN-04**: Migration action is idempotent and safe to run on live production data (uses `UpdateMode.Merge`, protected by sentinel row)

### Navigation

- [ ] **NAV-01**: Top navigation includes a "Departments" link to `/departments`
- [ ] **NAV-02**: Departments navigation link shows as active when the current path starts with `/departments`

### Departments Listing Page

- [ ] **LIST-01**: User can view all departments at `/departments` with name, color, headcount, total FTE, and team count per department
- [ ] **LIST-02**: Unassigned teams appear in a dedicated "Unassigned" bucket on the listing page with their aggregate headcount and FTE
- [ ] **LIST-03**: Departments listing page loads rollup stats in a single request (one fetch call, not one per department)
- [ ] **LIST-04**: Departments listing page shows a loading state while data is fetching and an error state on failure

### Department Detail Page

- [ ] **DETAIL-01**: User can navigate to `/departments/[deptId]` and see the department's name, color, description, department head, and baseline team list
- [ ] **DETAIL-02**: Department detail page shows all teams belonging to that department with baseline headcount and FTE per team
- [ ] **DETAIL-03**: Department detail page includes breadcrumb navigation back to `/departments`
- [ ] **DETAIL-04**: Team board column headers display the department's color badge when a department is assigned
- [ ] **DETAIL-05**: Department detail page shows a loading state while data is fetching and an error state on failure

### Developer Tooling

- [ ] **SEED-01**: Seed data generator creates sample departments and assigns teams to them (supports multi-department local dev setup)

## v2.1 Requirements (Deferred)

### Department Insights

- **INSGT-01**: Department listing shows retirement-eligible staff count per department
- **INSGT-02**: Department listing shows business driver distribution (Grow/Contain/Slim/Neutral) per department based on active scenario
- **INSGT-03**: Department listing shows squad vs non-squad staff count per department

### Department Management

- **MGMT-01**: User can reorder departments via drag-and-drop on the listing page
- **MGMT-02**: Department detail page includes a link to a filtered scenario board view for that department's teams

## Out of Scope

| Feature | Reason |
|---------|--------|
| Per-department scenario scoping | Scenarios remain cross-org; dept is a display grouping, not a planning boundary |
| Per-department access control / RBAC | Single-user app in v2.0; auth is a future milestone |
| Department budget / headcount targets | Financial accuracy expectations the app cannot meet without an HR system integration |
| Nested departments / sub-departments | Azure Table Storage ill-suited for tree traversal; new milestone if needed |
| Drag-and-drop team reassignment between depts | Structural master data change; deliberate form action is the right UX |
| Department health scores | Pseudo-metrics with no agreed definition; premature |

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| HARD-01 | Phase 1 | Pending |
| HARD-02 | Phase 1 | Pending |
| HARD-03 | Phase 1 | Pending |
| DEPT-01 | Phase 3 | Pending |
| DEPT-02 | Phase 3 | Pending |
| DEPT-03 | Phase 3 | Pending |
| DEPT-04 | Phase 3 | Pending |
| DEPT-05 | Phase 1 | Pending |
| ASSIGN-01 | Phase 3 | Pending |
| ASSIGN-02 | Phase 4 | Pending |
| ASSIGN-03 | Phase 3 | Pending |
| ASSIGN-04 | Phase 2 | Pending |
| NAV-01 | Phase 4 | Pending |
| NAV-02 | Phase 4 | Pending |
| LIST-01 | Phase 4 | Pending |
| LIST-02 | Phase 4 | Pending |
| LIST-03 | Phase 4 | Pending |
| LIST-04 | Phase 4 | Pending |
| DETAIL-01 | Phase 5 | Pending |
| DETAIL-02 | Phase 5 | Pending |
| DETAIL-03 | Phase 5 | Pending |
| DETAIL-04 | Phase 5 | Pending |
| DETAIL-05 | Phase 5 | Pending |
| SEED-01 | Phase 1 | Pending |

**Coverage:**
- v2.0 requirements: 24 total
- Mapped to phases: 24
- Unmapped: 0 ✓

---
*Requirements defined: 2026-05-18*
*Last updated: 2026-05-18 after initial definition*
