'use client';

import { useState } from 'react';
import {
  useDepartmentList,
  useDepartment,
  useCreateDepartment,
  useUpdateDepartment,
  useDeleteDepartment,
} from '@/lib/hooks/useDepartments';
import { DepartmentForm } from './DepartmentForm';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { extractErrorMessage } from '@/lib/utils/extractErrorMessage';
import type { Department } from '@/lib/types/domain';

function parseDeleteError(error: unknown): { message: string; assignedTeamCount?: number } {
  if (!(error instanceof Error)) return { message: 'Delete failed.' };
  try {
    const parsed = JSON.parse(error.message) as { error?: string; assignedTeamCount?: number };
    const count = parsed.assignedTeamCount ?? 0;
    return {
      message: count > 0
        ? `Cannot delete: ${count} team${count === 1 ? '' : 's'} ${count === 1 ? 'is' : 'are'} assigned to this department.`
        : parsed.error ?? 'Delete failed.',
      assignedTeamCount: count,
    };
  } catch {
    return { message: error.message || 'Delete failed.' };
  }
}

function DepartmentCard({
  dept,
  onEdit,
  onDelete,
  isAnyPending,
}: {
  dept: Department;
  onEdit: (id: string) => void;
  onDelete: (id: string) => void;
  isAnyPending: boolean;
}) {
  return (
    <div className="flex items-start justify-between rounded-lg border border-gray-200 bg-white p-4">
      <div className="flex items-start gap-3">
        <span
          className="mt-1 h-4 w-4 flex-shrink-0 rounded-full border border-gray-200"
          style={{ backgroundColor: dept.color }}
          aria-hidden="true"
        />
        <div>
          <p className="text-sm font-semibold text-gray-900">{dept.name}</p>
          {dept.description && (
            <p className="mt-0.5 text-xs text-gray-500">{dept.description}</p>
          )}
          {dept.deptHead && (
            <p className="mt-0.5 text-xs text-gray-400">Head: {dept.deptHead}</p>
          )}
        </div>
      </div>
      <div className="ml-4 flex flex-shrink-0 items-center gap-2">
        <button
          type="button"
          onClick={() => onEdit(dept.id)}
          disabled={isAnyPending}
          className="rounded-lg border border-gray-300 px-3 py-1.5 text-xs font-medium text-gray-800 transition-colors hover:bg-gray-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-500 disabled:cursor-not-allowed disabled:opacity-50"
        >
          Edit
        </button>
        <button
          type="button"
          onClick={() => onDelete(dept.id)}
          disabled={isAnyPending}
          className="rounded-lg border border-red-300 px-3 py-1.5 text-xs font-medium text-red-700 transition-colors hover:bg-red-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500 disabled:cursor-not-allowed disabled:opacity-50"
        >
          Delete
        </button>
      </div>
    </div>
  );
}

function EditFormWrapper({
  deptId,
  onSubmit,
  onCancel,
  isLoading,
  error,
}: {
  deptId: string;
  onSubmit: (data: { name: string; color: string; description?: string; deptHead?: string }) => void;
  onCancel: () => void;
  isLoading: boolean;
  error?: string | null;
}) {
  const { data: dept, isLoading: isFetching } = useDepartment(deptId);

  if (isFetching || !dept) {
    return (
      <div className="flex flex-col gap-3">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="h-9 w-full animate-pulse rounded-lg bg-gray-100" />
        ))}
      </div>
    );
  }

  return (
    <DepartmentForm
      mode="edit"
      key={deptId}
      initialData={dept}
      isLoading={isLoading}
      error={error}
      onSubmit={onSubmit}
      onCancel={onCancel}
    />
  );
}

export function DepartmentsSection() {
  const [selectedDeptId, setSelectedDeptId] = useState<string | null>(null);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [deletePendingId, setDeletePendingId] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const listQuery = useDepartmentList();
  const createMutation = useCreateDepartment();
  const updateMutation = useUpdateDepartment();
  const deleteMutation = useDeleteDepartment();

  const isAnyPending =
    createMutation.isPending || updateMutation.isPending || deleteMutation.isPending;

  const departments: Department[] = listQuery.data ?? [];

  const deletePendingDept = deletePendingId
    ? departments.find((d) => d.id === deletePendingId)
    : null;

  function handleEditClick(id: string) {
    createMutation.reset();
    updateMutation.reset();
    setSelectedDeptId(id);
  }

  function handleDeleteClick(id: string) {
    setDeleteError(null);
    setDeletePendingId(id);
    setDeleteConfirmOpen(true);
  }

  function handleCancelEdit() {
    setSelectedDeptId(null);
    updateMutation.reset();
  }

  function handleCreateSubmit(data: {
    name: string;
    color: string;
    description?: string;
    deptHead?: string;
  }) {
    createMutation.mutate(data, {
      onSuccess: () => {
        createMutation.reset();
      },
    });
  }

  function handleUpdateSubmit(data: {
    name: string;
    color: string;
    description?: string;
    deptHead?: string;
  }) {
    if (!selectedDeptId) return;
    updateMutation.mutate(
      { id: selectedDeptId, updates: data },
      {
        onSuccess: () => {
          setSelectedDeptId(null);
          updateMutation.reset();
        },
      }
    );
  }

  function handleDeleteConfirm() {
    if (!deletePendingId) return;
    setDeleteError(null);
    deleteMutation.mutate(deletePendingId, {
      onSuccess: () => {
        setDeleteConfirmOpen(false);
        setDeletePendingId(null);
        deleteMutation.reset();
        if (selectedDeptId === deletePendingId) setSelectedDeptId(null);
      },
      onError: (err) => {
        const { message } = parseDeleteError(err);
        setDeleteError(message);
      },
    });
  }

  function handleDeleteClose() {
    if (deleteMutation.isPending) return;
    setDeleteConfirmOpen(false);
    setDeletePendingId(null);
    setDeleteError(null);
    deleteMutation.reset();
  }

  const createErrorMsg = createMutation.error
    ? extractErrorMessage(createMutation.error, 'Failed to create department')
    : null;
  const updateErrorMsg = updateMutation.error
    ? extractErrorMessage(updateMutation.error, 'Failed to update department')
    : null;

  const deleteDialogDescription = deletePendingDept
    ? `"${deletePendingDept.name}" may have teams assigned. Deleting it cannot be undone. Are you sure?`
    : 'Are you sure you want to delete this department?';

  return (
    <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
      {/* LEFT: Create/Edit form */}
      <div>
        <h3 className="mb-4 text-base font-semibold text-gray-900">
          {selectedDeptId ? 'Edit Department' : 'Create Department'}
        </h3>

        {selectedDeptId ? (
          <EditFormWrapper
            deptId={selectedDeptId}
            onSubmit={handleUpdateSubmit}
            onCancel={handleCancelEdit}
            isLoading={updateMutation.isPending}
            error={updateErrorMsg}
          />
        ) : (
          <DepartmentForm
            mode="create"
            isLoading={createMutation.isPending}
            error={createErrorMsg}
            onSubmit={handleCreateSubmit}
          />
        )}
      </div>

      {/* RIGHT: Department list */}
      <div>
        <h3 className="mb-4 text-base font-semibold text-gray-900">
          Departments
          {departments.length > 0 && (
            <span className="ml-2 text-sm font-normal text-gray-500">
              ({departments.length})
            </span>
          )}
        </h3>

        {listQuery.isError && (
          <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3">
            <p className="text-sm text-red-700">
              Failed to load departments.{' '}
              {extractErrorMessage(listQuery.error)}
            </p>
          </div>
        )}

        {listQuery.isLoading && (
          <div className="flex flex-col gap-3">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-16 w-full animate-pulse rounded-lg bg-gray-100" />
            ))}
          </div>
        )}

        {!listQuery.isLoading && !listQuery.isError && departments.length === 0 && (
          <p className="text-sm text-gray-500">No departments yet. Create the first one.</p>
        )}

        {departments.length > 0 && (
          <div className="flex flex-col gap-3">
            {departments.map((dept) => (
              <DepartmentCard
                key={dept.id}
                dept={dept}
                onEdit={handleEditClick}
                onDelete={handleDeleteClick}
                isAnyPending={isAnyPending}
              />
            ))}
          </div>
        )}
      </div>

      {/* Delete confirmation dialog */}
      <ConfirmDialog
        open={deleteConfirmOpen}
        title="Delete Department?"
        description={deleteDialogDescription}
        confirmLabel="Delete"
        cancelLabel="Keep"
        pending={deleteMutation.isPending}
        error={deleteError}
        onConfirm={handleDeleteConfirm}
        onClose={handleDeleteClose}
      />
    </div>
  );
}
