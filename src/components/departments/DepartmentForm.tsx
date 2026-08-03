'use client';

import { useState } from 'react';
import { ColorPicker } from './ColorPicker';
import { SectionLabel } from '@/components/ui/SectionLabel';
import type { Department, DepartmentSkillInput } from '@/lib/types/domain';

const HEX_COLOR_REGEX = /^#[0-9A-Fa-f]{6}$/;

interface DepartmentFormProps {
  mode: 'create' | 'edit';
  initialData?: Partial<Department>;
  isLoading?: boolean;
  error?: string | null;
  onSubmit: (data: {
    name: string;
    color: string;
    description?: string;
    deptHead?: string;
    skills: DepartmentSkillInput[];
  }) => void;
  onCancel?: () => void;
}

const DEFAULT_COLOR = '#3b82f6';

function SkillRow({
  skill,
  onNameChange,
  onHeadcountChange,
  onRemove,
  disabled,
}: {
  skill: DepartmentSkillInput;
  onNameChange: (value: string) => void;
  onHeadcountChange: (value: number) => void;
  onRemove: () => void;
  disabled: boolean;
}) {
  return (
    <div className="flex items-center gap-2">
      <input
        type="text"
        value={skill.name}
        onChange={(e) => onNameChange(e.target.value)}
        placeholder="Skill name"
        disabled={disabled}
        className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 placeholder-gray-400 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 disabled:cursor-not-allowed disabled:bg-gray-50"
      />
      <input
        type="number"
        min={0}
        step={1}
        value={skill.requiredHeadcount}
        onChange={(e) => onHeadcountChange(Number(e.target.value))}
        placeholder="Required headcount"
        disabled={disabled}
        className="w-36 rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 placeholder-gray-400 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 disabled:cursor-not-allowed disabled:bg-gray-50"
      />
      <button
        type="button"
        onClick={onRemove}
        disabled={disabled}
        aria-label={`Remove ${skill.name || 'skill'}`}
        className="rounded-lg border border-gray-300 px-2 py-2 text-xs font-medium text-gray-600 transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
      >
        ×
      </button>
    </div>
  );
}

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
  const [skills, setSkills] = useState<DepartmentSkillInput[]>(
    (initialData?.skills ?? []).map((s) => ({ name: s.name, requiredHeadcount: s.requiredHeadcount }))
  );

  function isValidColor(value: string) {
    return HEX_COLOR_REGEX.test(value.trim());
  }

  function isValidSkills() {
    return skills.every(
      (s) => s.name.trim().length > 0 && Number.isFinite(s.requiredHeadcount) && s.requiredHeadcount >= 0
    );
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const trimmedColor = color.trim();

    if (!name.trim() || !isValidColor(trimmedColor) || !isValidSkills() || isLoading) {
      return;
    }

    const data: {
      name: string;
      color: string;
      description?: string;
      deptHead?: string;
      skills: DepartmentSkillInput[];
    } = {
      name: name.trim(),
      color: trimmedColor,
      skills: skills.map((s) => ({ name: s.name.trim(), requiredHeadcount: Math.trunc(s.requiredHeadcount) })),
    };
    if (description.trim()) data.description = description.trim();
    if (deptHead.trim()) data.deptHead = deptHead.trim();

    onSubmit(data);
  }

  const isSubmitDisabled = isLoading || !name.trim() || !isValidColor(color) || !isValidSkills();

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

      <div className="flex flex-col gap-2">
        <SectionLabel>Skills</SectionLabel>
        <p className="text-xs text-gray-500">
          These apply to every team in this department. Teams can adjust the required headcount per skill, but
          not the skill set itself.
        </p>
        {skills.map((skill, index) => (
          <SkillRow
            key={index}
            skill={skill}
            disabled={isLoading}
            onNameChange={(value) =>
              setSkills((prev) => prev.map((s, i) => (i === index ? { ...s, name: value } : s)))
            }
            onHeadcountChange={(value) =>
              setSkills((prev) => prev.map((s, i) => (i === index ? { ...s, requiredHeadcount: value } : s)))
            }
            onRemove={() => setSkills((prev) => prev.filter((_, i) => i !== index))}
          />
        ))}
        <button
          type="button"
          onClick={() => setSkills((prev) => [...prev, { name: '', requiredHeadcount: 1 }])}
          disabled={isLoading}
          className="self-start rounded-lg border border-gray-300 px-3 py-1.5 text-xs font-medium text-gray-800 transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
        >
          + Add skill
        </button>
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
