'use client';

import Link from 'next/link';
import { useDepartmentList } from '@/lib/hooks/useDepartments';
import { extractErrorMessage } from '@/lib/utils/extractErrorMessage';
import { InfoHint } from '@/components/ui/InfoHint';

export function OrgDashboard() {
  const { data: departments = [], isLoading, error } = useDepartmentList();

  const totalHeadcount = departments.reduce((sum, d) => sum + d.headcount, 0);
  const totalFte = departments.reduce((sum, d) => sum + d.totalFte, 0);
  const totalTeams = departments.reduce((sum, d) => sum + d.teamCount, 0);

  const stats = [
    {
      label: 'Total Headcount',
      value: totalHeadcount.toLocaleString(),
      hint: 'Total number of staff members across all departments.',
    },
    {
      label: 'Total FTE',
      value: totalFte.toFixed(1),
      hint: 'Sum of all full-time equivalents. Accounts for part-time staff (e.g., 0.8 FTE counts as 0.8, not 1.0).',
    },
    {
      label: 'Departments',
      value: departments.length.toLocaleString(),
      hint: 'Number of organizational units (e.g., faculties or administrative divisions).',
    },
    {
      label: 'Teams',
      value: totalTeams.toLocaleString(),
      hint: 'Total teams across all departments. Teams are the primary unit for workforce planning.',
    },
  ];

  return (
    <div className="max-w-6xl mx-auto py-6 px-4">
      <h1 className="flex items-center gap-1.5 text-2xl font-bold text-gray-900">
        Organization
        <InfoHint text="Top-level overview of your university's workforce: departmental breakdown, headcount, and FTE metrics used in planning." />
      </h1>
      <p className="text-gray-600">Overview of departments and workforce metrics.</p>

      {/* Metrics row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
        {stats.map((stat) => (
          <div key={stat.label} className="rounded-lg border border-gray-200 bg-white p-4">
            <p className="flex items-center gap-1 text-xs uppercase tracking-wide text-gray-600">
              {stat.label}
              <InfoHint text={stat.hint} />
            </p>
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
        <div className="mt-6 rounded-lg border border-gray-200 bg-white p-8 text-center">
          <p className="text-sm font-medium text-gray-900">No departments yet</p>
          <p className="mt-1 text-sm text-gray-600">
            Start by creating departments and seeding sample data.
          </p>
          <div className="mt-4 flex items-center justify-center gap-3">
            <Link
              href="/departments"
              className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-800 transition-colors hover:bg-gray-50"
            >
              Create Departments
            </Link>
            <Link
              href="/settings"
              className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700"
            >
              Seed Sample Data
            </Link>
          </div>
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
