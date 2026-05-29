# Security Audit — Phase 5: Department Detail Page & Visual Integration

**Audit date:** 2026-05-20
**Phase:** 05-department-detail-page-visual-integration
**Auditor:** Retroactive STRIDE audit (no PLAN.md; register built from implementation)
**ASVS level:** 1 (internal single-tenant tool, no auth by design)
**Threats closed:** 9/11
**Threats open (BLOCKER):** 1
**Unregistered flags:** 1

---

## Architectural context

Single-tenant internal HR/workforce planning tool deployed on Azure App Service.
Authentication is an accepted architectural decision deferred to v2.0.
No per-department or per-user access control is in scope.
Backend: Azure Table Storage via `@azure/data-tables`.

---

## Threat Register

| threat_id | STRIDE category | component | description | disposition | status | evidence |
|-----------|-----------------|-----------|-------------|-------------|--------|----------|
| P5-S01 | Spoofing | `GET /api/departments/[id]` | Caller supplies arbitrary `id`; server reflects data for any stored department | accept | CLOSED | No-auth design decision; internal tool only. See Accepted Risks below. |
| P5-S02 | Spoofing | `GET /api/teams?departmentId=` | Caller supplies arbitrary `departmentId`; server returns teams for any dept | accept | CLOSED | Same no-auth design decision. |
| P5-T01 | Tampering | `PATCH /api/departments/[id]` | Caller can overwrite `name`, `color`, `description`, `deptHead` without ownership proof | accept | CLOSED | No-auth design decision; internal tool only. |
| P5-T02 | Tampering | `DELETE /api/departments/[id]` | Caller can delete any department by guessing/knowing its ID | accept | CLOSED | No-auth design decision; internal tool only. |
| P5-T03 | Tampering | `PATCH /api/departments/[id]` — OData filter | `deleteDepartment` in `src/lib/api/departments.ts:216` constructs an OData filter by string interpolation of the caller-supplied `id` without sanitization: `` `departmentId eq '${id}'` ``. A crafted `id` containing a single-quote could manipulate the filter. | mitigate | **OPEN** | No escaping, validation, or UUID-format guard found on `id` before it reaches the OData string. See Open Threats below. |
| P5-R01 | Repudiation | All mutating routes (PATCH, DELETE) | No audit trail written for department mutations introduced in this phase | accept | CLOSED | Audit log is a future scope item; existing `AuditEvent` type is defined but not wired to department mutations. Accepted for v1. |
| P5-I01 | Information Disclosure | `GET /api/departments/[id]` 404 | 404 body confirms department non-existence; enables enumeration | accept | CLOSED | Internal tool; enumeration risk accepted. |
| P5-I02 | Information Disclosure | Error message propagation in UI | `page.tsx:49` renders `error.message` directly from fetch errors into the DOM | mitigate | CLOSED | `fetchJSON` (`src/lib/utils/fetchJSON.ts:5`) extracts only `json.error` (a string field) or `"STATUS statusText"` from API responses; no stack traces or internal detail propagated. Confirmed no `dangerouslySetInnerHTML` in UI components. |
| P5-I03 | Information Disclosure | `assignedTeamCount` in 409 response | DELETE 409 reveals count of teams assigned to the department | accept | CLOSED | Count is operational feedback for the UI; not sensitive in internal context. |
| P5-D01 | Denial of Service | `GET /api/teams?departmentId=` | Handler calls `getAllTeams()` then `getAllMembers()` (full table scans) on every request; no pagination or rate limiting | accept | CLOSED | Internal tool with small dataset; no SLA commitment. Azure App Service default request limits transfer risk to platform. |
| P5-E01 | Elevation of Privilege | Color field stored as free-form string, rendered via `style={{ backgroundColor: ... }}` | An attacker (or erroneous input) could store a CSS expression or `url()` payload in the `color` field; it is injected verbatim into inline styles in `DepartmentTeamRow`, `TeamHeader`, and `DepartmentDetailPage` | mitigate | **OPEN (unregistered flag also)** | PATCH validation checks only `typeof color === 'string' && color.trim() !== ''` — no hex/CSS format enforcement. No CSP header found to contain CSS injection fallout. See Open Threats below. |

---

## Open Threats (BLOCKERS)

### P5-T03 — OData Filter Injection in `deleteDepartment`

**File:** `src/lib/api/departments.ts`, line 216

```
client.listEntities<TeamEntity>({ queryOptions: { filter: `departmentId eq '${id}'` } })
```

The `id` value is taken directly from the URL path parameter (`params.id`) and passed unchanged into an OData filter string. Azure Table Storage OData supports logical operators via `'`, `and`, `or`, `not` in string literals. A crafted ID such as `x' or '1' eq '1` would expand the filter to match all entities regardless of `departmentId`, making it possible to:

- Enumerate whether any teams exist across all departments (information disclosure)
- Trigger an unexpected refusal to delete by inflating `assignedCount`

**Required mitigation before ship:** Validate that `id` conforms to a UUID v4 pattern (e.g. `/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i`) at the route handler level before passing to any data layer function. The same guard should be applied in `GET` and `PATCH` handlers.

---

### P5-E01 — Unvalidated Color Value in Inline CSS

**Files:**
- `src/app/api/departments/[id]/route.ts`, lines 39–41 (PATCH — only non-empty string checked)
- `src/components/departments/DepartmentTeamRow.tsx`, line 18
- `src/components/teams/TeamHeader.tsx`, lines 44, 49
- `src/app/departments/[deptId]/page.tsx`, line 82

The `color` field accepts any non-empty string. Browser handling of arbitrary values in `style={{ backgroundColor: value }}` is generally safe in modern browsers (CSS expressions were removed in IE8; `url()` in `background-color` is non-standard and ignored by all major engines). However, the absence of format validation and the absence of a Content-Security-Policy header means:

- There is no server-side contract enforcing the hex color format, making data integrity guarantees impossible.
- If a future refactor moves the value into a `<style>` block or CSS variable with interpolation, the stored payload would execute without any additional change to the stored data.

**Required mitigation before ship:** Enforce a hex color format at API input validation (`/^#[0-9A-Fa-f]{6}$/` or allow named CSS color keywords via allowlist). Applies to both the PATCH route and the POST (create) route in `src/app/api/departments/route.ts`.

---

## Accepted Risks

| risk_id | description | rationale | review_date |
|---------|-------------|-----------|-------------|
| AR-01 | No authentication on any API route | v1 is a single-tenant internal tool; auth deferred to v2.0 scope decision | 2026-Q4 |
| AR-02 | No per-department access control | Single-tenant; all users are trusted internal employees | 2026-Q4 |
| AR-03 | No audit trail for department PATCH/DELETE mutations | Audit log type is defined (`AuditEvent`) but not wired; low risk given internal context | 2027-Q1 |
| AR-04 | Full table scans on every `/api/teams?departmentId=` request | Dataset is small; acceptable until load testing indicates otherwise | 2026-Q4 |
| AR-05 | Department ID enumeration via 404 response | Internal tool; enumeration risk is negligible | 2027-Q1 |

---

## Unregistered Flags

| flag_id | source | description | mapping |
|---------|--------|-------------|---------|
| UF-01 | Implementation observation | `color` value rendered in inline CSS without format enforcement — no corresponding threat was registered during implementation | Escalated to P5-E01 (OPEN BLOCKER above) |

---

## Transfer Documentation

No threats are dispositioned as `transfer` in this phase. Azure App Service default request-rate handling is noted as ambient infrastructure protection for P5-D01 (accepted, not formally transferred).
