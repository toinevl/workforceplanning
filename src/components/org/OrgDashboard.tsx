'use client';

import Link from 'next/link';
import { useDepartmentList } from '@/lib/hooks/useDepartments';
import { extractErrorMessage } from '@/lib/utils/extractErrorMessage';

export function OrgDashboard() {
  const { data: departments = [], isLoading, error } = useDepartmentList();

  const totalHeadcount = departments.reduce((sum, d) => sum + d.headcount, 0);
  const totalFte = departments.reduce((sum, d) => sum + d.totalFte, 0);
  const totalTeams = departments.reduce((sum, d) => sum + d.teamCount, 0);

  const stats = [
    { label: 'Total Headcount', value: totalHeadcount.toLocaleString() },
    { label: 'Total FTE', value: totalFte.toFixed(1) },
    { label: 'Departments', value: departments.length.toLocaleString() },
    { label: 'Teams', value: totalTeams.toLocaleString() },
  ];

  return (
    <div className="max-w-6xl mx-auto py-6 px-4">
      <h1 className="text-2xl font-bold text-gray-900">Organization</h1>
      <p className="text-gray-600">Overview of departments and workforce metrics.</p>

      {/* Metrics row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
        {stats.map((stat) => (
          <div key={stat.label} className="rounded-lg border border-gray-200 bg-white p-4">
            <p className="text-xs uppercase tracking-wide text-gray-600">{stat.label}</p>
            <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
          </div>
        ))}
      </div>

      {/* Department grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mt-6">
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-32 w-full animate-pulse rounded-lg bg-gray-100" />
          ))}
        </div>
      ) : error ? (
        <div className="mt-6 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {extractErrorMessage(error)}
        </div>
      ) : departments.length === 0 ? (
        <div className="mt-6 rounded-lg border border-gray-200 bg-white p-4 text-gray-600">
          No departments yet. <Link href="/departments" className="text-blue-600 hover:underline">Add one</Link>.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mt-6">
          {departments.map((dept) => (
            <Link
              key={dept.id}
              href={`/departments/${dept.id}`}
              className="rounded-lg border border-gray-200 bg-white p-4 hover:shadow-md transition-shadow"
            >
              <div className="flex items-center gap-2">
                <span
                  className="h-4 w-4 rounded-full inline-block"
                  style={{ backgroundColor: dept.color }}
                  aria-hidden
                />
                <span className="font-semibold text-gray-900">{dept.name}</span>
              </div>
              {dept.deptHead && (
                <p className="text-sm text-gray-600 mt-1">{dept.deptHead}</p>
              )}
              <p className="text-xs text-gray-600 mt-2">
                {dept.teamCount} {dept.teamCount === 1 ? 'team' : 'teams'} · {dept.headcount}{' '}
                {dept.headcount === 1 ? 'person' : 'people'} · {dept.totalFte.toFixed(1)} FTE
              </p>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
