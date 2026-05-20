---
phase: 05
slug: department-detail-page-visual-integration
status: verified
threats_open: 0
asvs_level: 1
created: 2026-05-20
---

# Phase 05 — Security

> Retroactive-STRIDE audit. No PLAN.md threat model existed — register built from implementation files.

---

## Trust Boundaries

| Boundary | Description | Data Crossing |
|----------|-------------|---------------|
| Client → API | HTTP requests to Next.js API routes | Department IDs (path), departmentId filter (query param), department field updates (body) |
| API → Azure Table Storage | SDK calls via `@azure/data-tables` | OData filter strings, entity reads/writes |

---

## Threat Register

| Threat ID | Category | Component | Disposition | Mitigation | Status |
|-----------|----------|-----------|-------------|------------|--------|
| P5-S01 | Spoofing — Unauthenticated API access | All API routes | accept | No-auth internal tool; single-tenant, network-isolated deployment. See AR-01. | closed |
| P5-S02 | Spoofing — CSRF on mutating endpoints | PATCH/DELETE `/api/departments/[id]` | accept | Same-origin fetch from React app; no cross-origin mutation surface for internal tool. See AR-01. | closed |
| P5-T01 | Tampering — Unvalidated PATCH body | `/api/departments/[id]` PATCH | accept | Internal tool; no hostile users. See AR-01. | closed |
| P5-T02 | Tampering — Unvalidated `departmentId` query param | `/api/teams?departmentId=` | mitigate | `encodeURIComponent()` applied client-side (`useTeams.ts`); value used only for in-memory array filter, never OData interpolation. | closed |
| P5-T03 | Tampering — OData filter injection via `id` path param | `src/lib/api/departments.ts:216`, `[id]/route.ts` | mitigate | UUID v4 regex guard (`/^[0-9a-f]{8}-…$/i`) added at route entry for GET, PATCH, DELETE. Non-UUID `id` returns 404 before reaching data layer. | closed |
| P5-R01 | Repudiation — No audit log for department mutations | PATCH/DELETE handlers | accept | Audit logging deferred to v2.1. See AR-03. | closed |
| P5-I01 | Information Disclosure — Department enumeration via sequential IDs | `GET /api/departments/[id]` | accept | IDs are UUIDs (non-guessable). See AR-05. | closed |
| P5-I02 | Information Disclosure — Internal error details in API responses | PATCH error handler (`throw error`) | mitigate | `fetchJSON` extracts only `json.error` string; storage SDK error internals do not reach the UI. No `dangerouslySetInnerHTML` in any Phase 5 component. | closed |
| P5-I03 | Information Disclosure — `assignedTeamCount` in 409 response | DELETE handler | accept | Count is operational feedback needed by the UI; no sensitive data. See AR-05. | closed |
| P5-D01 | Denial of Service — Full table scan on filtered teams query | `GET /api/teams?departmentId=` | accept | Small internal dataset; in-memory filter adequate at this scale. See AR-04. | closed |
| P5-E01 | CSS Injection — Unvalidated `color` field in inline styles | POST `/api/departments`, PATCH `/api/departments/[id]` | mitigate | Hex color regex (`/^#[0-9A-Fa-f]{6}$/`) enforced on both POST create and PATCH update. Invalid values rejected with 400. | closed |

---

## Accepted Risks Log

| Risk ID | Threat Ref | Rationale | Accepted By | Date |
|---------|------------|-----------|-------------|------|
| AR-01 | P5-S01, P5-S02, P5-T01 | No authentication by design — single-tenant internal tool. Out of scope for v2.0 per PROJECT.md. | toine@van-vliet.eu | 2026-05-20 |
| AR-03 | P5-R01 | Audit logging deferred to v2.1 Department Management milestone. | toine@van-vliet.eu | 2026-05-20 |
| AR-04 | P5-D01 | Full table scan acceptable at current internal scale (<100 teams). Revisit at v3.0 if scale changes. | toine@van-vliet.eu | 2026-05-20 |
| AR-05 | P5-I01, P5-I03 | No sensitive PII in department data; team counts are non-sensitive operational data. | toine@van-vliet.eu | 2026-05-20 |

---

## Security Audit Trail

| Audit Date | Threats Total | Closed | Open | Run By |
|------------|---------------|--------|------|--------|
| 2026-05-20 | 11 | 11 | 0 | gsd-security-auditor (retroactive-STRIDE) + manual fixes |

---

## Sign-Off

- [x] All threats have a disposition (mitigate / accept / transfer)
- [x] Accepted risks documented in Accepted Risks Log
- [x] `threats_open: 0` confirmed
- [x] `status: verified` set in frontmatter

**Approval:** verified 2026-05-20
