'use client';

import { useState } from 'react';
import type { Department } from '@/lib/types/domain';
import { ColorPicker } from './ColorPicker';
import { SectionLabel } from '@/components/ui/SectionLabel';

interface DepartmentFormProps {
  mode: 'create' | 'edit';
  initialData?: Partial<Department>;
  isLoading?: boolean;
  error?: string | null;
  onSubmit: (data: { name: string; color: string; description?: string; deptHead?: string }) => void;
  onCancel?: () => void;
}

const DEFAULT_COLOR = '#3b82f6';

export function DepartmentForm({
  mode,
  initialData,
  isLoading = false,
  error,
  onSubmit,
  onCancel,
}: DepartmentFormProps) {
  const [name, setName] = useState(initialData?.name ?? '');
  const [color, setColor] = useState(initialData?.color ?? DEFAULT_COLOR);
  const [description, setDescription] = useState(initialData?.description ?? '');
  const [deptHead, setDeptHead] = useState(initialData?.deptHead ?? '');

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!name.trim() || isLoading) return;

    const data: { name: string; color: string; description?: string; deptHead?: string } = {
      name: name.trim(),
      color,
    };
    if (description.trim()) data.description = description.trim();
    if (deptHead.trim()) data.deptHead = deptHead.trim();

    onSubmit(data);
  }

  const isSubmitDisabled = isLoading || !name.trim();

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3">
          <p className="text-sm text-red-700">{error}</p>
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
          placeholder="e.g., Engineering"
          required
          disabled={isLoading}
          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 placeholder-gray-400 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 disabled:cursor-not-allowed disabled:bg-gray-50 disabled:text-gray-500"
        />
      </div>

      {/* Color */}
      <div className="flex flex-col gap-1">
        <ColorPicker
          value={color}
          onChange={setColor}
          label="Color *"
        />
      </div>

      {/* Description */}
      <div className="flex flex-col gap-1">
        <SectionLabel>Description</SectionLabel>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Team charter, mission, notes..."
          disabled={isLoading}
          rows={3}
          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 placeholder-gray-400 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 disabled:cursor-not-allowed disabled:bg-gray-50 disabled:text-gray-500 resize-none"
        />
      </div>

      {/* Department Head */}
      <div className="flex flex-col gap-1">
        <SectionLabel>Department Head</SectionLabel>
        <input
          type="text"
          value={deptHead}
          onChange={(e) => setDeptHead(e.target.value)}
          placeholder="e.g., Jane Smith"
          disabled={isLoading}
          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 placeholder-gray-400 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 disabled:cursor-not-allowed disabled:bg-gray-50 disabled:text-gray-500"
        />
      </div>

      {/* Actions */}
      <div className="flex items-center justify-end gap-2 pt-2">
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            disabled={isLoading}
            className="rounded-lg border border-gray-300 px-3 py-2 text-sm font-medium text-gray-800 transition-colors hover:bg-gray-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-500 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Cancel
          </button>
        )}
        <button
          type="submit"
          disabled={isSubmitDisabled}
          className="rounded-lg bg-blue-600 px-3 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isLoading ? 'Working...' : mode === 'create' ? 'Create Department' : 'Save Changes'}
        </button>
      </div>
    </form>
  );
}

export type { DepartmentFormProps };
