'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { AppShell } from '@/components/layout/AppShell';
import { DepartmentTeamRow } from '@/components/departments/DepartmentTeamRow';
import { useDepartment } from '@/lib/hooks/useDepartments';
import { useDepartmentTeams } from '@/lib/hooks/useTeams';

export default function DepartmentDetailPage() {
  const params = useParams<{ deptId: string }>();
  const deptId = params.deptId;
  const departmentQuery = useDepartment(deptId);
  const teamsQuery = useDepartmentTeams(deptId);

  const department = departmentQuery.data;
  const isLoading = departmentQuery.isLoading || teamsQuery.isLoading;
  const isError = departmentQuery.isError || teamsQuery.isError;
  const error = departmentQuery.error ?? teamsQuery.error;
  const isNotFound = error instanceof Error && error.message.toLowerCase().includes('not found');

  return (
    <AppShell>
      <div className="max-w-6xl mx-auto py-6 px-4">
        {isLoading && (
          <>
            <div className="h-4 w-48 bg-gray-100 rounded animate-pulse" />
            <div className="mt-4 h-8 w-64 bg-gray-200 rounded animate-pulse" />
            <div className="mt-2 space-y-2">
              <div className="h-4 w-96 max-w-full bg-gray-100 rounded animate-pulse" />
              <div className="h-4 w-32 bg-gray-100 rounded animate-pulse" />
            </div>
            <div className="mt-8">
              <div className="h-6 w-16 bg-gray-200 rounded animate-pulse mb-4" />
              <div className="flex flex-col gap-2">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="h-14 w-full bg-gray-100 rounded-lg animate-pulse" />
                ))}
              </div>
            </div>
          </>
        )}

        {!isLoading && isError && (
          <div className="mt-6 rounded-lg border border-red-200 bg-red-50 px-4 py-3">
            <p className="text-sm text-red-700">
              {isNotFound
                ? 'Department not found. It may have been deleted.'
                : `Failed to load department. ${error instanceof Error ? error.message : ''}`}
            </p>
            <Link
              href="/departments"
              className="mt-2 inline-block text-sm font-normal text-red-700 underline underline-offset-2 hover:text-red-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500 rounded"
            >
              Back to Departments
            </Link>
          </div>
        )}

        {!isLoading && !isError && department && (
          <>
            <nav aria-label="Breadcrumb">
              <ol className="flex items-center gap-2 text-sm">
                <li>
                  <Link
                    href="/departments"
                    className="font-normal text-gray-500 hover:text-gray-700 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-500 rounded"
                  >
                    Departments
                  </Link>
                </li>
                <li aria-hidden="true" className="text-gray-400">/</li>
                <li>
                  <span className="font-normal text-gray-900">{department.name}</span>
                </li>
              </ol>
            </nav>

            <div className="mt-4 flex items-center gap-2">
              <span
                className="h-4 w-4 rounded-full border border-gray-200 shrink-0"
                style={{ backgroundColor: department.color }}
                aria-hidden="true"
              />
              <h1 className="text-2xl font-bold text-gray-900">{department.name}</h1>
            </div>

            <div className="mt-2 flex flex-col gap-1">
              {department.description && (
                <p className="text-sm text-gray-700">{department.description}</p>
              )}
              {department.deptHead && (
                <p className="text-sm text-gray-500">Head: {department.deptHead}</p>
              )}
            </div>

            <div className="mt-8">
              <h2 className="text-lg font-bold text-gray-900">Teams</h2>
              {(teamsQuery.data?.length ?? 0) > 0 ? (
                <div className="mt-4 flex flex-col gap-2">
                  {(teamsQuery.data ?? []).map((team) => (
                    <DepartmentTeamRow key={team.id} team={team} />
                  ))}
                </div>
              ) : (
                <p className="mt-6 text-sm text-gray-500">
                  No teams assigned to this department yet. Go to Settings to assign teams.
                </p>
              )}
            </div>
          </>
        )}
      </div>
    </AppShell>
  );
}
