'use client';

import { useRouter } from 'next/navigation';
import { useScenariosByDepartment, useCreateScenario } from '@/lib/hooks/useScenario';
import { extractErrorMessage } from '@/lib/utils/extractErrorMessage';
import { InfoHint } from '@/components/ui/InfoHint';

const TYPE_LABELS: Record<string, string> = {
  retirement_wave: 'Retirement Wave',
  squad_removal: 'Squad Removal',
  business_drivers: 'Business Drivers',
};

/**
 * Active scenarios panel for a department detail page.
 * Shows scenarios linked to this department and provides a quick-start
 * button to create a new department-scoped scenario.
 */
export function DepartmentScenarios({ departmentId }: { departmentId: string }) {
  const router = useRouter();
  const { data: scenarios = [], isLoading, error } = useScenariosByDepartment(departmentId);
  const createScenario = useCreateScenario();

  function handleCreate() {
    const name = `${new Date().toLocaleDateString('en-US', { month: 'short', year: 'numeric' })} Reorganization`;
    createScenario.mutate(
      { type: 'business_drivers', name, departmentId },
      {
        onSuccess: (scenario) => {
          router.push(`/scenarios/${scenario.id}`);
        },
      }
    );
  }

  return (
    <div className="mt-8">
      <div className="flex items-center gap-2">
        <h2 className="text-lg font-bold text-gray-900">Scenarios</h2>
        <InfoHint text="Scenarios created from this department are scoped to its teams only. Plan reorganizations, model changes, and compare outcomes." />
      </div>

      <div className="mt-4 flex flex-col gap-3">
        {isLoading && (
          <div className="h-16 w-full animate-pulse rounded-lg bg-gray-100" />
        )}

        {error && (
          <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3">
            <p className="text-sm text-red-700">{extractErrorMessage(error, 'Failed to load scenarios')}</p>
          </div>
        )}

        {!isLoading && !error && scenarios.length === 0 && (
          <div className="rounded-lg border border-gray-200 bg-gray-50 p-6 text-center">
            <p className="text-sm text-gray-600">No scenarios for this department yet.</p>
            <p className="mt-1 text-sm text-gray-500">Start planning to model changes and compare outcomes.</p>
          </div>
        )}

        {scenarios.length > 0 && (
          <>
            {scenarios.map((s) => (
              <button
                key={s.id}
                onClick={() => router.push(`/scenarios/${s.id}`)}
                className="flex items-center justify-between rounded-lg border border-gray-200 bg-white p-4 text-left hover:border-gray-300 hover:shadow-sm transition-all"
              >
                <div className="flex items-center gap-3">
                  <div>
                    <p className="text-sm font-semibold text-gray-900">{s.name}</p>
                    <p className="text-xs text-gray-600">{TYPE_LABELS[s.type] ?? s.type}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 text-xs text-gray-600">
                  {s.removedCount > 0 && <span>{s.removedCount} removed</span>}
                  <span>{s.totalFte.toFixed(1)} FTE</span>
                </div>
              </button>
            ))}
          </>
        )}
      </div>

      <button
        onClick={handleCreate}
        disabled={createScenario.isPending}
        className="mt-4 inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {createScenario.isPending ? 'Creating...' : '+ Plan Reorganization'}
      </button>

      {createScenario.isError && (
        <p className="mt-2 text-xs text-red-600">
          {extractErrorMessage(createScenario.error, 'Failed to create scenario')}
        </p>
      )}
    </div>
  );
}
