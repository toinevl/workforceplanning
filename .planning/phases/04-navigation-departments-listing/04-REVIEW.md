---
phase: 04-navigation-departments-listing
reviewed: 2026-05-20T00:00:00Z
depth: standard
files_reviewed: 5
files_reviewed_list:
  - src/app/departments/page.tsx
  - src/components/departments/DepartmentCard.tsx
  - src/components/layout/TopNav.tsx
  - src/lib/hooks/useDepartments.ts
  - src/lib/types/domain.ts
findings:
  critical: 4
  warning: 4
  info: 0
  total: 8
status: issues_found
---

# Phase 04: Code Review Report

**Reviewed:** 2026-05-20
**Depth:** standard
**Files Reviewed:** 5
**Status:** issues_found

## Summary

The departments listing feature has been implemented with navigation integration, but the code contains multiple critical bugs that will cause runtime failures, and several warning-level issues that degrade reliability. Four critical issues must be fixed before shipment: unsafe type coercion on numeric fields, unvalidated object property access, error handling that leaks raw JSON to users, and a logical condition that will never trigger. Four additional warnings address error handling inconsistencies and potential XSS/hydration issues.

## Critical Issues

### CR-01: Unsafe type coercion on totalFte field

**File:** `src/components/departments/DepartmentCard.tsx:51`
**Issue:** The code calls `.toFixed(1)` on `dept.totalFte` without verifying it is a number. If the backend returns a string, null, or undefined, this will throw `TypeError: dept.totalFte.toFixed is not a function` and crash the component.

**Fix:**
```typescript
{dept.totalFte != null ? dept.totalFte.toFixed(1) : '0.0'} FTE
```

---

### CR-02: Unvalidated object key access causes undefined rendering

**File:** `src/components/layout/TopNav.tsx:82`
**Issue:** The code performs direct dictionary lookup `TYPE_LABELS[board.scenario.type]` without verifying that `board.scenario.type` matches one of the keys ('squad_removal', 'retirement_wave', 'business_drivers'). If the backend returns an unexpected scenario type, this renders `undefined` to the DOM inside a `<span>` tag, displaying "undefined" to the user.

**Fix:**
```typescript
<span className="text-xs px-1.5 py-0.5 bg-gray-100 text-gray-700 rounded">
  {TYPE_LABELS[board.scenario.type] ?? 'Unknown'}
</span>
```

---

### CR-03: Stringified error object leaks internal data to user

**File:** `src/lib/hooks/useDepartments.ts:55`
**Issue:** The `useDeleteDepartment` mutation throws an error by stringifying an object containing internal fields (`assignedTeamCount`). This JSON string is then extracted and displayed to the user via `page.tsx:30` (`listQuery.error.message`). The code exposes backend state information that could be used to infer system structure or trigger information disclosure.

**Fix:**
```typescript
onSuccess: () => qc.invalidateQueries({ queryKey: ['departments'] }),
    mutationFn: (id: string) =>
      fetch(`/api/departments/${id}`, { method: 'DELETE' }).then(async (r) => {
        const json = await r.json().catch(() => ({}));
        if (!r.ok) {
          // Return a user-safe message; log the full error server-side
          const teamCount = json.assignedTeamCount ?? 0;
          throw new Error(
            teamCount > 0
              ? `Cannot delete department with assigned teams (${teamCount} team${teamCount !== 1 ? 's' : ''})`
              : 'Failed to delete department'
          );
        }
      }),
```

---

### CR-04: Dead code condition never evaluates to true

**File:** `src/app/departments/page.tsx:41`
**Issue:** Line 38 uses `(listQuery.data ?? [])` to provide a default empty array if data is undefined. Line 41 then checks `listQuery.data?.length === 0`. If `listQuery.data` is `undefined`, the optional chaining on line 41 evaluates to `undefined !== 0`, so the empty state message is never shown. The condition should access the array that was already mapped.

**Fix:**
```typescript
{/* Data state */}
{!listQuery.isLoading && !listQuery.isError && (
  <div className="mt-6 flex flex-col gap-4">
    {(listQuery.data ?? []).map((dept) => (
      <DepartmentCard key={dept.id} dept={dept} />
    ))}
    {(listQuery.data?.length ?? 0) === 0 && (
      <p className="mt-6 text-sm text-gray-500">
        No departments yet. Go to Settings to create the first one.
      </p>
    )}
  </div>
)}
```

---

## Warnings

### WR-01: Inconsistent error handling across mutations

**File:** `src/lib/hooks/useDepartments.ts:22-76`
**Issue:** Only `useDeleteDepartment` (lines 52-57) includes explicit error handling with `.catch()` and `!r.ok` checks. The other mutations (`useCreateDepartment`, `useUpdateDepartment`) call `fetchJSON()` directly without any catch handling. If `fetchJSON` throws an error or the response is not OK, these mutations will propagate unhandled errors to the caller.

**Fix:** Wrap all mutation functions consistently:
```typescript
export function useCreateDepartment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (body: { name: string; color: string; description?: string; deptHead?: string }) => {
      const response = await fetch('/api/departments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (!response.ok) {
        const error = await response.json().catch(() => ({ error: 'Failed to create department' }));
        throw new Error(error.error || 'Failed to create department');
      }
      return response.json();
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['departments'] }),
  });
}
```

---

### WR-02: Silent error swallowing hides real failures

**File:** `src/lib/hooks/useDepartments.ts:53`
**Issue:** The `.catch(() => ({}))` swallows all JSON parsing errors without distinguishing between malformed JSON responses and genuine network/server errors. A malformed 5xx response will be silently converted to an empty object, causing confusing behavior downstream.

**Fix:** Log or re-throw parsing errors:
```typescript
const json = await r.json().catch((parseErr) => {
  console.error('Failed to parse DELETE response:', parseErr);
  return { error: 'Invalid server response' };
});
```

---

### WR-03: Unvalidated color value in inline style

**File:** `src/components/departments/DepartmentCard.tsx:20`
**Issue:** The `dept.color` value is applied directly to an inline style without validation. If the backend returns an invalid CSS color (e.g., `"javascript:alert(1)"` or `"${malicious}"`), the browser will silently ignore it (defense-in-depth for this specific case), but it still represents a data validation gap. An attacker could potentially craft a color value that breaks styling or causes unexpected rendering.

**Fix:**
```typescript
// Add a color validation utility
function isValidCSSColor(color: string): boolean {
  const div = document.createElement('div');
  div.style.color = color;
  return div.style.color !== '';
}

// In DepartmentCard:
const badgeStyle = isUnassigned ? undefined : (
  isValidCSSColor(dept.color) ? { backgroundColor: dept.color } : undefined
);
```

---

### WR-04: Hydration mismatch risk with conditional BUILD_TIME

**File:** `src/components/layout/TopNav.tsx:43`
**Issue:** The code uses `suppressHydrationWarning` to suppress hydration mismatch warnings for the version badge. While `suppressHydrationWarning` prevents the warning from being logged, the condition `{BUILD_TIME ? ... : ''}` can still differ between server-side render and client-side hydration if BUILD_TIME is environment-dependent. This creates invisible hydration mismatches that could cause subtle bugs.

**Fix:**
```typescript
<span
  suppressHydrationWarning
  title={typeof BUILD_TIME === 'string' && BUILD_TIME ? `Built ${new Date(BUILD_TIME).toLocaleTimeString()}` : undefined}
  className="rounded border border-gray-300 bg-gray-50 px-1.5 py-0.5 text-xs font-medium text-gray-700 cursor-default"
>
  {typeof APP_VERSION === 'string' ? `v${APP_VERSION}` : 'v?'}
  {typeof GIT_COMMIT === 'string' && GIT_COMMIT ? ` (${GIT_COMMIT})` : ''}
</span>
```

---

_Reviewed: 2026-05-20_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
