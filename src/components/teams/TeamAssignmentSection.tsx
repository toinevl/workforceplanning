'use client';

import { useTeamList, useUpdateTeam } from '@/lib/hooks/useTeams';
import { useDepartmentList } from '@/lib/hooks/useDepartments';
import { extractErrorMessage } from '@/lib/utils/extractErrorMessage';
import { InfoHint } from '@/components/ui/InfoHint';

/**
 * Team-to-department assignment table.
 *
 * Lists all teams with an inline dropdown to assign/reassign each team to a
 * department. Saved immediately on change. Shows a "Unassigned" badge for
 * teams with no department.
 */
export function TeamAssignmentSection() {
  const teamList = useTeamList();
  const deptList = useDepartmentList();
  const updateTeam = useUpdateTeam();

  const teams = teamList.data ?? [];
  const departments = [...(deptList.data ?? [])].sort((a, b) => a.sortOrder - b.sortOrder);

  const unassignedCount = teams.filter((t) => !t.departmentId).length;

  function handleAssign(teamId: string, departmentId: string) {
    updateTeam.mutate({
      id: teamId,
      updates: { departmentId: departmentId || undefined },
    });
  }

  return (
    <div>
      <div className="flex items-center gap-2">
        <h2 className="text-lg font-semibold text-gray-900">Team Assignment</h2>
        <InfoHint text="Assign each team to a department. Changes are saved immediately. Use 'Unassigned' to remove a team from its department." />
      </div>
      <p className="mt-1 text-sm text-gray-600">
        Assign teams to departments. Changes are saved automatically.
        {unassignedCount > 0 && (
          <span className="ml-1 font-medium text-amber-700">
            {unassignedCount} team{unassignedCount === 1 ? '' : 's'} unassigned.
          </span>
        )}
      </p>

      <div className="mt-4 rounded-lg border border-gray-200 overflow-hidden">
        {teamList.isLoading && (
          <div className="p-4 space-y-2">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-10 w-full animate-pulse rounded bg-gray-100" />
            ))}
          </div>
        )}

        {teamList.isError && (
          <div className="p-4 text-sm text-red-700">
            Failed to load teams. {extractErrorMessage(teamList.error)}
          </div>
        )}

        {!teamList.isLoading && !teamList.isError && teams.length === 0 && (
          <div className="p-6 text-center text-sm text-gray-500">
            No teams yet. Use the seed panel above to create sample data.
          </div>
        )}

        {teams.length > 0 && (
          <table className="w-full">
            <thead className="border-b border-gray-200 bg-gray-50">
              <tr>
                <th className="px-4 py-2 text-left text-xs font-semibold uppercase tracking-wide text-gray-600">
                  Team
                </th>
                <th className="px-4 py-2 text-left text-xs font-semibold uppercase tracking-wide text-gray-600">
                  Department
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {teams.map((team) => {
                const dept = departments.find((d) => d.id === team.departmentId);
                return (
                  <tr
                    key={team.id}
                    className={`${updateTeam.isPending && updateTeam.variables?.id === team.id ? 'opacity-50' : ''} transition-opacity`}
                  >
                    <td className="px-4 py-2.5">
                      <div className="flex items-center gap-2">
                        <span
                          className="h-3 w-3 rounded-full border border-gray-200 shrink-0"
                          style={{ backgroundColor: team.color }}
                          aria-hidden="true"
                        />
                        <span className="text-sm font-medium text-gray-900">{team.name}</span>
                      </div>
                    </td>
                    <td className="px-4 py-2.5">
                      <select
                        value={team.departmentId ?? ''}
                        onChange={(e) => handleAssign(team.id, e.target.value)}
                        disabled={updateTeam.isPending}
                        className="w-full max-w-xs rounded-lg border border-gray-300 px-3 py-1.5 text-sm text-gray-900 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 disabled:cursor-not-allowed"
                      >
                        <option value="">Unassigned</option>
                        {departments.map((d) => (
                          <option key={d.id} value={d.id}>
                            {d.name}
                          </option>
                        ))}
                      </select>
                      {dept && (
                        <span
                          className="ml-2 inline-block h-2 w-2 rounded-full align-middle"
                          style={{ backgroundColor: dept.color }}
                          aria-hidden="true"
                        />
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {updateTeam.isError && (
        <p className="mt-2 text-xs text-red-600">
          {extractErrorMessage(updateTeam.error, 'Failed to update team assignment')}
        </p>
      )}
    </div>
  );
}
