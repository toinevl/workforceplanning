'use client';

import { useState } from 'react';
import { ScenarioCard } from '@/components/scenarios/ScenarioCard';
import { useScenarioList, useCreateScenario, useDeleteScenario, useSeed } from '@/lib/hooks/useScenario';
import type { ScenarioType } from '@/lib/types/domain';

const TYPES: { value: ScenarioType; label: string; desc: string }[] = [
  { value: 'squad_removal', label: 'Squad Removal', desc: 'Remove SQUAD members from teams' },
  { value: 'retirement_wave', label: 'Retirement Wave', desc: 'Plan for upcoming retirements' },
  { value: 'business_drivers', label: 'Business Drivers', desc: 'Align teams with business strategy' },
];

export default function ScenariosPage() {
  const { data: scenarios = [], isLoading, error } = useScenarioList();
  const createMutation = useCreateScenario();
  const deleteMutation = useDeleteScenario();
  const seedMutation = useSeed();

  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({ type: 'squad_removal' as ScenarioType, name: '', description: '' });

  function handleCreate() {
    if (!form.name.trim()) return;
    createMutation.mutate(
      { type: form.type, name: form.name.trim(), description: form.description.trim() || undefined },
      { onSuccess: () => { setShowCreate(false); setForm({ type: 'squad_removal', name: '', description: '' }); } }
    );
  }

  return (
    <div className="max-w-6xl mx-auto py-6 px-4">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Workforce Planning</h1>
          <p className="text-sm text-gray-500 mt-1">Create and explore workforce scenarios</p>
        </div>
        <div className="flex items-center gap-2">
          {scenarios.length === 0 && (
            <button
              onClick={() => seedMutation.mutate()}
              disabled={seedMutation.isPending}
              className="text-sm px-3 py-1.5 border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-40 transition-colors"
            >
              {seedMutation.isPending ? 'Seeding…' : 'Seed Data'}
            </button>
          )}
          <button
            onClick={() => setShowCreate(true)}
            className="text-sm px-4 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-700 transition-colors"
          >
            + New Scenario
          </button>
        </div>
      </div>

      {isLoading && (
        <div className="flex items-center justify-center py-20">
          <span className="text-gray-400">Loading scenarios…</span>
        </div>
      )}

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700 text-sm">
          Failed to load scenarios. Is the database running?
        </div>
      )}

      {!isLoading && scenarios.length === 0 && !error && (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <p className="text-gray-500 text-lg mb-2">No scenarios yet</p>
          <p className="text-gray-400 text-sm mb-6">
            Seed sample data or create your first scenario to get started.
          </p>
          <button
            onClick={() => seedMutation.mutate()}
            disabled={seedMutation.isPending}
            className="text-sm px-4 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-700 disabled:opacity-40 transition-colors"
          >
            {seedMutation.isPending ? 'Seeding…' : 'Seed Sample Data'}
          </button>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {scenarios.map((s) => (
          <ScenarioCard
            key={s.id}
            scenario={s}
            onDelete={() => {
              if (confirm(`Delete "${s.name}"?`)) deleteMutation.mutate(s.id);
            }}
          />
        ))}
      </div>

      {showCreate && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6">
            <h2 className="font-semibold text-gray-900 text-lg mb-4">New Scenario</h2>

            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-gray-700">Type</label>
                <div className="mt-1.5 space-y-2">
                  {TYPES.map((t) => (
                    <label key={t.value} className="flex items-start gap-3 cursor-pointer">
                      <input
                        type="radio"
                        name="type"
                        value={t.value}
                        checked={form.type === t.value}
                        onChange={() => setForm((f) => ({ ...f, type: t.value }))}
                        className="mt-0.5"
                      />
                      <div>
                        <p className="text-sm font-medium text-gray-800">{t.label}</p>
                        <p className="text-xs text-gray-500">{t.desc}</p>
                      </div>
                    </label>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-sm font-medium text-gray-700">Name</label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                  onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
                  placeholder="e.g. Q3 Retirement Planning"
                  className="mt-1 w-full border border-gray-200 rounded-lg px-3 py-2 text-sm"
                  autoFocus
                />
              </div>

              <div>
                <label className="text-sm font-medium text-gray-700">Description (optional)</label>
                <textarea
                  value={form.description}
                  onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                  rows={2}
                  className="mt-1 w-full border border-gray-200 rounded-lg px-3 py-2 text-sm resize-none"
                />
              </div>
            </div>

            <div className="flex gap-2 mt-6">
              <button
                onClick={() => setShowCreate(false)}
                className="flex-1 py-2 border border-gray-200 text-gray-600 text-sm rounded-lg hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleCreate}
                disabled={!form.name.trim() || createMutation.isPending}
                className="flex-1 py-2 bg-gray-900 text-white text-sm rounded-lg hover:bg-gray-700 disabled:opacity-40 transition-colors"
              >
                {createMutation.isPending ? 'Creating…' : 'Create'}
              </button>
            </div>

            {createMutation.isError && (
              <p className="text-xs text-red-500 mt-2">{(createMutation.error as Error).message}</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
