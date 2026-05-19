'use client';

import { useState } from 'react';
import { createPortal } from 'react-dom';
import { useDepartmentList, useMigrateDepartments } from '@/lib/hooks/useDepartments';

interface BulkMigrateButtonProps {
  unassignedTeamCount: number;
}

export function BulkMigrateButton({ unassignedTeamCount }: BulkMigrateButtonProps) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedDeptId, setSelectedDeptId] = useState<string>('');
  const [migrationError, setMigrationError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [migrationDone, setMigrationDone] = useState(false);

  const { data: departments = [], isLoading: isDeptLoading, error: deptError } = useDepartmentList();
  const migrateMutation = useMigrateDepartments();

  const sortedDepartments = [...departments].sort((a, b) => a.sortOrder - b.sortOrder);

  // Keep selectedDeptId in sync with first department once loaded
  if (!selectedDeptId && sortedDepartments.length > 0) {
    setSelectedDeptId(sortedDepartments[0].id);
  }

  const isButtonDisabled = unassignedTeamCount === 0 || migrationDone;

  function handleOpenDialog() {
    if (isButtonDisabled) return;
    setMigrationError(null);
    migrateMutation.reset();
    setDialogOpen(true);
  }

  function handleCloseDialog() {
    if (migrateMutation.isPending) return;
    setDialogOpen(false);
    setMigrationError(null);
    migrateMutation.reset();
  }

  function handleBackdropClick(e: React.MouseEvent<HTMLDivElement>) {
    if (e.target === e.currentTarget && !migrateMutation.isPending) handleCloseDialog();
  }

  function handleConfirm() {
    if (!selectedDeptId || migrateMutation.isPending) return;
    setMigrationError(null);

    migrateMutation.mutate(selectedDeptId, {
      onSuccess: (data) => {
        const result = data as { assigned: number; skipped: number } | undefined;
        const count = result?.assigned ?? unassignedTeamCount;
        setSuccessMessage(`Successfully assigned ${count} team${count === 1 ? '' : 's'}`);
        setMigrationDone(true);
        setDialogOpen(false);
      },
      onError: (err) => {
        setMigrationError(err instanceof Error ? err.message : 'Migration failed');
      },
    });
  }

  return (
    <>
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <button
          type="button"
          onClick={handleOpenDialog}
          disabled={isButtonDisabled}
          title={unassignedTeamCount === 0 ? 'No unassigned teams' : undefined}
          className={
            isButtonDisabled
              ? 'rounded-lg border border-gray-200 bg-gray-100 px-4 py-2 text-sm font-medium text-gray-400 cursor-not-allowed'
              : 'rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500'
          }
        >
          Assign All Unassigned Teams
          {unassignedTeamCount > 0 && !migrationDone && (
            <span className="ml-2 rounded-full bg-blue-500/20 px-2 py-0.5 text-xs font-semibold tabular-nums">
              {unassignedTeamCount}
            </span>
          )}
        </button>

        {successMessage && (
          <p className="text-sm font-medium text-emerald-700">{successMessage}</p>
        )}
      </div>

      {dialogOpen && typeof document !== 'undefined' &&
        createPortal(
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
            onMouseDown={handleBackdropClick}
          >
            <div
              role="dialog"
              aria-modal="true"
              aria-label="Assign unassigned teams"
              className="w-full max-w-md rounded-xl border border-gray-200 bg-white p-6 shadow-xl"
            >
              <h2 className="text-lg font-semibold text-gray-950">Assign Unassigned Teams?</h2>
              <p className="mt-2 text-sm leading-6 text-gray-700">
                This will assign {unassignedTeamCount} unassigned team
                {unassignedTeamCount === 1 ? '' : 's'} to the selected department. This can only
                be done once.
              </p>

              {migrationError && (
                <div className="mt-3 rounded-lg border border-red-200 bg-red-50 px-4 py-3">
                  <p className="text-sm text-red-700">{migrationError}</p>
                </div>
              )}

              {deptError && (
                <div className="mt-3 rounded-lg border border-red-200 bg-red-50 px-4 py-3">
                  <p className="text-sm text-red-700">Failed to load departments. Please try again.</p>
                </div>
              )}

              <div className="mt-4 flex flex-col gap-1">
                <label
                  htmlFor="migrate-dept-select"
                  className="text-xs font-medium uppercase tracking-wide text-gray-700"
                >
                  Select target department:
                </label>
                {isDeptLoading ? (
                  <div className="h-9 w-full animate-pulse rounded-lg bg-gray-100" />
                ) : (
                  <select
                    id="migrate-dept-select"
                    value={selectedDeptId}
                    onChange={(e) => setSelectedDeptId(e.target.value)}
                    disabled={migrateMutation.isPending || sortedDepartments.length === 0}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 disabled:cursor-not-allowed disabled:bg-gray-50 disabled:text-gray-500"
                  >
                    {sortedDepartments.length === 0 ? (
                      <option value="">No departments available</option>
                    ) : (
                      sortedDepartments.map((dept) => (
                        <option key={dept.id} value={dept.id}>
                          {dept.name}
                        </option>
                      ))
                    )}
                  </select>
                )}
              </div>

              <div className="mt-6 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={handleCloseDialog}
                  disabled={migrateMutation.isPending}
                  className="rounded-lg border border-gray-300 px-3 py-2 text-sm font-medium text-gray-800 transition-colors hover:bg-gray-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-500 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleConfirm}
                  disabled={migrateMutation.isPending || !selectedDeptId || sortedDepartments.length === 0}
                  className="rounded-lg bg-blue-600 px-3 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {migrateMutation.isPending ? 'Assigning...' : 'Assign'}
                </button>
              </div>
            </div>
          </div>,
          document.body
        )}
    </>
  );
}
