# Drone Findings — 2026-06-28

Source: delegation `deleg_02cf42ea` (2 parallel drones)
- Drone A: phase learnings review (file-only)
- Drone B: Azure best-practices doc review (file-only)

No code changes were made. These findings are captured for review and wishlist mapping.

## Key findings

### Safety / security
- validate UUID format before interpolating `id` into OData filters (`src/lib/api/departments.ts:216`)
  - wishlist: already covered by `#0` hardening/validation for department detail page
- enforce hex color format at PATCH/POST department routes
  - wishlist: already covered by `#0` (security audit register P5-E01)
- add Content-Security-Policy header restricting `style-src`
  - not explicitly in wishlist yet; recommendation: add to `#0` scope or a new security follow-up
- keep long-lived SAS and raw secret leakage blocked; current deploy path already removed
  - wishlist: `#8` marked done

### Velocity
- staging slot + promote pipeline still absent from `.github/workflows/deploy.yml`
  - wishlist: `#7` open; recommendation: keep prioritized in Azure track
- runtime tier still F1 Free
  - wishlist: `#9` open; recommendation: move up after `#8`
- load/error/empty states still open on department surfaces
  - wishlist: `#1` open; depends on `#0`

### Repeatability
- seed/scripting standardization not yet documented
  - new recommendation: add doc or script block under `docs/` or `.planning/`
- architecture decision record (ADR) not present
  - recommendation: convert `docs/azure-swa-nextjs-table-storage-best-practices.md` into an ADR summary linked from `.planning/`
- table Storage query path audit still open
  - wishlist: `#4` open
- error swallowing in `src/lib/db/client.ts:38-52` hides infra issues
  - recommendation: refinement for `#4` or a new follow-up under security/perf

### Azure-specific recommendations from best-practices doc
- Node LTS pinning: prefer pinning exact LTS in CI/runtime; current `~22`
  - recommendation: add to `#5` or `#9` scope
- secrets strategy: prefer Key Vault + Managed Identity over plaintext connection string output
  - recommendation: add to `#5` / Phase 2
- table naming consistency: consider singular PascalCase vs current lowercase plural
  - recommendation: add to `.planning/azure-rebuild-plan.md` rename proposal

## Wishlist alignment

| Drone recommendation | Existing wishlist item | Status |
|---|---|---|
| UUID + color validation + CSP | `#0` | in-progress |
| staging slot + promote | `#7` | open |
| Standard tier | `#9` | open |
| load/error/empty states | `#1` | open, blocked by `#0` |
| query path audit | `#4` | open |
| best-practices doc incorporation | `#10` | in-progress |
| seed documentation | none | new recommendation |
| error swallow fix | none | new recommendation |
| Node LTS pinning | `#5` or `#9` | in-flight/open |
| secrets/Key Vault + MI | `#5` / Phase 2 | in-flight |

## Next actions to consider
- capture the two new recommendations as explicit wishlist items if you want them tracked
- fold the Azure-specific naming/versioning recommendations into `.planning/azure-rebuild-plan.md`
- keep `#0` and `#5` moving; they are the current critical-path items
