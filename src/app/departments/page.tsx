'use client';

import { AppShell } from '@/components/layout/AppShell';
import { useDepartmentList } from '@/lib/hooks/useDepartments';
import { DepartmentCard } from '@/components/departments/DepartmentCard';

export default function DepartmentsPage() {
  const listQuery = useDepartmentList();

  return (
    <AppShell>
      <div className="max-w-6xl mx-auto py-6 px-4">
        <h1 className="text-2xl font-bold text-gray-900">Departments</h1>
        <p className="mt-1 text-sm text-gray-600">All departments and rollup stats.</p>

        {/* Loading state */}
        {listQuery.isLoading && (
          <div className="mt-6 flex flex-col gap-3">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-16 w-full animate-pulse rounded-lg bg-gray-100" />
            ))}
          </div>
        )}

        {/* Error state */}
        {listQuery.isError && (
          <div className="mt-6 rounded-lg border border-red-200 bg-red-50 px-4 py-3">
            <p className="text-sm text-red-700">
              Failed to load departments.{' '}
              {listQuery.error instanceof Error ? listQuery.error.message : ''}
            </p>
          </div>
        )}

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
      </div>
    </AppShell>
  );
}
