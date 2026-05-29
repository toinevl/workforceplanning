---
phase: 05-department-detail-page-visual-integration
completed_date: "2026-05-20"
status: implemented
requirements:
  - DETAIL-01
  - DETAIL-02
  - DETAIL-03
  - DETAIL-04
  - DETAIL-05
---

# Phase 5 Summary

Implemented the read-only department detail page and board department color integration.

## Completed

- Added `GET /api/departments/[id]` with a 404 response for missing departments.
- Extended `GET /api/teams?departmentId=` to return baseline `headcount` and `totalFte` per team.
- Added `TeamWithStats` and `useDepartmentTeams(departmentId)`.
- Added `/departments/[deptId]` with breadcrumb, loading, error, not-found, empty, and teams-list states.
- Added `DepartmentTeamRow` for detail-page team rows.
- Made regular department cards on `/departments` link to `/departments/[deptId]`; the synthetic Unassigned bucket remains display-only.
- Added department color badges to scenario board team headers via `TeamBoard -> TeamColumn -> TeamHeader`.

## Verification

- `npx tsc --noEmit` passes.
- `npm run build` passes and includes `/departments/[deptId]` as a dynamic route.
- `npm run lint` exits 0. Remaining warnings are inside `.claude/worktrees/*`, not the source tree.
- Existing dev server at `http://localhost:3000` responds for `/departments`.
- `GET /api/departments/not-real` returns `404 {"error":"Department not found"}`.

## Notes

- The current local data only contains the synthetic Unassigned bucket, so a real department detail page still needs seeded or created department data for visual inspection.
- Department board badges use the existing departments query data. If departments are not cached yet, TanStack Query will fetch them once through `useDepartmentList`.
