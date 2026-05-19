'use client';

import { useState } from 'react';
import { createPortal } from 'react-dom';
import type { Team } from '@/lib/types/domain';
import { useDepartmentList } from '@/lib/hooks/useDepartments';
import { useUpdateTeam } from '@/lib/hooks/useTeams';
import { SectionLabel } from '@/components/ui/SectionLabel';

interface TeamFormModalProps {
  team: Team;
  onClose: () => void;
  onSuccess?: () => void;
}

export function TeamFormModal({ team, onClose, onSuccess }: TeamFormModalProps) {
  const [name, setName] = useState(team.name);
  const [departmentId, setDepartmentId] = useState(team.departmentId ?? '');
  const [submitError, setSubmitError] = useState<string | null>(null);

  const { data: departments = [], isLoading: isDeptLoading, error: deptError } = useDepartmentList();
  const updateTeam = useUpdateTeam();

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!name.trim() || updateTeam.isPending) return;

    setSubmitError(null);

    updateTeam.mutate(
      {
        id: team.id,
        updates: {
          name: name.trim(),
          // Empty string means "Unassigned" — send undefined to remove departmentId
          departmentId: departmentId || undefined,
        },
      },
      {
        onSuccess: () => {
          onSuccess?.();
          onClose();
        },
        onError: (err) => {
          setSubmitError(err instanceof Error ? err.message : 'Failed to update team');
        },
      }
    );
  }

  function handleBackdropClick(e: React.MouseEvent<HTMLDivElement>) {
    if (e.target === e.currentTarget && !updateTeam.isPending) onClose();
  }

  if (typeof document === 'undefined') return null;

  const sortedDepartments = [...departments].sort((a, b) => a.sortOrder - b.sortOrder);

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onMouseDown={handleBackdropClick}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={`Edit team: ${team.name}`}
        className="w-full max-w-md rounded-xl border border-gray-200 bg-white p-6 shadow-xl"
      >
        <h2 className="text-lg font-semibold text-gray-950">Edit Team</h2>
        <p className="mt-1 text-sm text-gray-600">{team.name}</p>

        <form onSubmit={handleSubmit} className="mt-4 flex flex-col gap-4">
          {submitError && (
            <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3">
              <p className="text-sm text-red-700">{submitError}</p>
            </div>
          )}

          {/* Name */}
          <div className="flex flex-col gap-1">
            <SectionLabel>
              Name <span className="text-red-500" aria-hidden="true">*</span>
            </SectionLabel>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              disabled={updateTeam.isPending}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 placeholder-gray-400 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 disabled:cursor-not-allowed disabled:bg-gray-50 disabled:text-gray-500"
            />
          </div>

          {/* Department */}
          <div className="flex flex-col gap-1">
            <SectionLabel>Department</SectionLabel>
            {isDeptLoading ? (
              <div className="h-9 w-full animate-pulse rounded-lg bg-gray-100" />
            ) : (
              <select
                value={departmentId}
                onChange={(e) => setDepartmentId(e.target.value)}
                disabled={updateTeam.isPending}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 disabled:cursor-not-allowed disabled:bg-gray-50 disabled:text-gray-500"
              >
                <option value="">Unassigned</option>
                {sortedDepartments.map((dept) => (
                  <option key={dept.id} value={dept.id}>
                    {dept.name}
                  </option>
                ))}
              </select>
            )}
            {deptError && (
              <p className="text-xs text-red-600">
                {deptError instanceof Error ? deptError.message : 'Failed to load departments'}
              </p>
            )}
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              disabled={updateTeam.isPending}
              className="rounded-lg border border-gray-300 px-3 py-2 text-sm font-medium text-gray-800 transition-colors hover:bg-gray-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-500 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={updateTeam.isPending || !name.trim()}
              className="rounded-lg bg-blue-600 px-3 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {updateTeam.isPending ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
}
