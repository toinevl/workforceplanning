'use client';

import { useState } from 'react';
import { useTeamList, useUpdateTeam } from '@/lib/hooks/useTeams';
import { extractErrorMessage } from '@/lib/utils/extractErrorMessage';
import { InfoHint } from '@/components/ui/InfoHint';

/**
 * Inline team manager for a department detail page.
 * Shows teams assigned to this department and lets the user
 * assign unassigned teams or unassign existing ones.
 */
export function DepartmentTeamManager({ departmentId }: { departmentId: string }) {
  const [showUnassigned, setShowUnassigned] = useState(false);
  const teamList = useTeamList();
  const updateTeam = useUpdateTeam();

  const allTeams = teamList.data ?? [];
  const assignedTeams = allTeams.filter((t) => t.departmentId === departmentId);
  const unassignedTeams = allTeams.filter((t) => !t.departmentId);

  function handleAssign(teamId: string) {
    updateTeam.mutate({ id: teamId, updates: { departmentId } });
  }

  function handleUnassign(teamId: string) {
    updateTeam.mutate({ id: teamId, updates: { departmentId: undefined } });
  }

  return (
    <div className="mt-8">
      <div className="flex items-center gap-2">
        <h2 className="text-lg font-bold text-gray-900">Teams ({assignedTeams.length})</h2>
        <InfoHint text="Assign teams to this department. Changes save immediately. Only assigned teams appear in department-scoped scenarios." />
      </div>

      {teamList.isLoading && (
        <div className="mt-4 space-y-2">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-10 w-full animate-pulse rounded-lg bg-gray-100" />
          ))}
        </div>
      )}

      {teamList.isError && (
        <div className="mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3">
          <p className="text-sm text-red-700">{extractErrorMessage(teamList.error)}</p>
        </div>
      )}

      {assignedTeams.length > 0 && (
        <div className="mt-4 flex flex-col gap-2">
          {assignedTeams.map((team) => (
            <div
              key={team.id}
              className="flex items-center justify-between rounded-lg border border-gray-200 bg-white p-3"
            >
              <div className="flex items-center gap-2">
                <span
                  className="h-3 w-3 rounded-full border border-gray-200 shrink-0"
                  style={{ backgroundColor: team.color }}
                  aria-hidden="true"
                />
                <span className="text-sm font-medium text-gray-900">{team.name}</span>
              </div>
              <button
                onClick={() => handleUnassign(team.id)}
                disabled={updateTeam.isPending}
                className="text-xs font-medium text-gray-500 transition-colors hover:text-red-600 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Unassign
              </button>
            </div>
          ))}
        </div>
      )}

      {assignedTeams.length === 0 && !teamList.isLoading && (
        <p className="mt-4 text-sm text-gray-500">No teams assigned to this department yet.</p>
      )}

      {unassignedTeams.length > 0 && (
        <div className="mt-4">
          <button
            onClick={() => setShowUnassigned(!showUnassigned)}
            className="text-sm font-medium text-blue-600 transition-colors hover:text-blue-800"
          >
            {showUnassigned ? 'Hide' : `Show ${unassignedTeams.length} unassigned team${unassignedTeams.length === 1 ? '' : 's'}`}
          </button>
          {showUnassigned && (
            <div className="mt-2 flex flex-col gap-1.5">
              {unassignedTeams.map((team) => (
                <div
                  key={team.id}
                  className="flex items-center justify-between rounded-lg border border-gray-200 bg-gray-50 p-2.5"
                >
                  <div className="flex items-center gap-2">
                    <span
                      className="h-3 w-3 rounded-full border border-gray-200 shrink-0"
                      style={{ backgroundColor: team.color }}
                      aria-hidden="true"
                    />
                    <span className="text-sm text-gray-700">{team.name}</span>
                  </div>
                  <button
                    onClick={() => handleAssign(team.id)}
                    disabled={updateTeam.isPending}
                    className="text-xs font-medium text-blue-600 transition-colors hover:text-blue-800 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    Assign
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {updateTeam.isError && (
        <p className="mt-2 text-xs text-red-600">
          {extractErrorMessage(updateTeam.error, 'Failed to update team assignment')}
        </p>
      )}
    </div>
  );
}
