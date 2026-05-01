'use client';

import { useState } from 'react';
import { cn } from '@/lib/utils/cn';
import { useParameters, useUpdateParameters, useApplyLogic } from '@/lib/hooks/useParameters';
import type { BoardState, BusinessDriver } from '@/lib/types/domain';
import type { SquadRemovalParams, RetirementWaveParams, BusinessDriverParams } from '@/lib/types/params';

const DRIVERS: BusinessDriver[] = ['grow', 'contain', 'slim', 'neutral'];
const DRIVER_LABELS: Record<BusinessDriver, string> = {
  grow: 'Grow',
  contain: 'Contain',
  slim: 'Slim',
  neutral: 'Neutral',
};

interface ParametersPanelProps {
  board: BoardState;
  onClose: () => void;
}

export function ParametersPanel({ board, onClose }: ParametersPanelProps) {
  const scenarioId = board.scenario.id;
  const { data: params } = useParameters(scenarioId);
  const updateParams = useUpdateParameters(scenarioId);
  const applyLogic = useApplyLogic(scenarioId);

  function handleApply() {
    applyLogic.mutate();
  }

  if (!params) {
    return (
      <aside className="w-72 shrink-0 border-l border-gray-200 bg-white flex items-center justify-center">
        <span className="text-sm text-gray-400">Loading…</span>
      </aside>
    );
  }

  return (
    <aside className="w-72 shrink-0 border-l border-gray-200 bg-white flex flex-col">
      <div className="flex items-center justify-between px-4 py-3 border-b">
        <h2 className="font-semibold text-sm text-gray-900">Parameters</h2>
        <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl leading-none">×</button>
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        {board.scenario.type === 'squad_removal' && (
          <SquadRemovalForm
            board={board}
            params={params as SquadRemovalParams}
            onChange={(p) => updateParams.mutate(p)}
          />
        )}
        {board.scenario.type === 'retirement_wave' && (
          <RetirementWaveForm
            params={params as RetirementWaveParams}
            onChange={(p) => updateParams.mutate(p)}
          />
        )}
        {board.scenario.type === 'business_drivers' && (
          <BusinessDriversForm
            board={board}
            params={params as BusinessDriverParams}
            onChange={(p) => updateParams.mutate(p)}
          />
        )}
      </div>

      <div className="p-4 border-t space-y-2">
        <button
          onClick={handleApply}
          disabled={applyLogic.isPending}
          className="w-full py-2 bg-gray-900 text-white text-sm rounded-lg hover:bg-gray-700 disabled:opacity-50 transition-colors"
        >
          {applyLogic.isPending ? 'Applying…' : 'Apply Logic'}
        </button>
        {applyLogic.isError && (
          <p className="text-xs text-red-500">{(applyLogic.error as Error).message}</p>
        )}
      </div>
    </aside>
  );
}

function SquadRemovalForm({
  board,
  params,
  onChange,
}: {
  board: BoardState;
  params: SquadRemovalParams;
  onChange: (p: SquadRemovalParams) => void;
}) {
  const squadMembers = board.teams
    .flatMap((t) => t.members)
    .filter((m) => m.isSquad);

  const removedSquad = board.removedMembers.filter((m) => m.isSquad);
  const all = [...squadMembers, ...removedSquad];

  function toggle(id: string) {
    const current = params.membersToRemove ?? [];
    const next = current.includes(id) ? current.filter((x) => x !== id) : [...current, id];
    onChange({ membersToRemove: next });
  }

  return (
    <div className="space-y-3">
      <p className="text-xs text-gray-500">Select SQUAD members to remove from teams.</p>
      {all.length === 0 && <p className="text-sm text-gray-400 italic">No SQUAD members found.</p>}
      {all.map((m) => (
        <label key={m.id} className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={(params.membersToRemove ?? []).includes(m.id)}
            onChange={() => toggle(m.id)}
            className="rounded border-gray-300"
          />
          <span className="text-sm text-gray-700">{m.name}</span>
          <span className="text-xs text-gray-400 ml-auto">{m.role}</span>
        </label>
      ))}
    </div>
  );
}

function RetirementWaveForm({
  params,
  onChange,
}: {
  params: RetirementWaveParams;
  onChange: (p: RetirementWaveParams) => void;
}) {
  function update(partial: Partial<RetirementWaveParams>) {
    onChange({ ...params, ...partial });
  }

  return (
    <div className="space-y-4">
      <Field label="Retirement Age">
        <input
          type="number"
          value={params.retirementAge}
          min={55}
          max={75}
          onChange={(e) => update({ retirementAge: +e.target.value })}
          className="w-full border border-gray-200 rounded px-2 py-1 text-sm"
        />
      </Field>

      <Field label="Service Years Threshold">
        <input
          type="number"
          value={params.serviceYearsThreshold}
          min={10}
          max={45}
          onChange={(e) => update({ serviceYearsThreshold: +e.target.value })}
          className="w-full border border-gray-200 rounded px-2 py-1 text-sm"
        />
      </Field>

      <Field label="Planning Horizon">
        <select
          value={params.horizonYears}
          onChange={(e) => update({ horizonYears: +e.target.value as 1 | 3 | 5 })}
          className="w-full border border-gray-200 rounded px-2 py-1 text-sm"
        >
          <option value={1}>1 year</option>
          <option value={3}>3 years</option>
          <option value={5}>5 years</option>
        </select>
      </Field>

      <Field label="Auto-flag Eligible">
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={params.autoFlagEligible}
            onChange={(e) => update({ autoFlagEligible: e.target.checked })}
            className="rounded border-gray-300"
          />
          <span className="text-sm text-gray-600">Automatically flag at-risk members</span>
        </label>
      </Field>
    </div>
  );
}

function BusinessDriversForm({
  board,
  params,
  onChange,
}: {
  board: BoardState;
  params: BusinessDriverParams;
  onChange: (p: BusinessDriverParams) => void;
}) {
  function setTeamDriver(teamId: string, driver: BusinessDriver) {
    onChange({
      ...params,
      teamDrivers: { ...params.teamDrivers, [teamId]: driver },
    });
  }

  function setFteDelta(driver: BusinessDriver, delta: number) {
    onChange({
      ...params,
      targetFteDelta: { ...params.targetFteDelta, [driver]: delta },
    });
  }

  function setPriority(teamId: string, score: number) {
    onChange({
      ...params,
      teamPriorityScore: { ...params.teamPriorityScore, [teamId]: score },
    });
  }

  return (
    <div className="space-y-5">
      <div>
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
          Team Drivers
        </p>
        <div className="space-y-2">
          {board.teams.map((ts) => (
            <div key={ts.team.id} className="space-y-1">
              <div className="flex items-center gap-2">
                <span
                  className="w-2.5 h-2.5 rounded-full shrink-0"
                  style={{ backgroundColor: ts.team.color }}
                />
                <span className="text-xs font-medium text-gray-700 flex-1 truncate">{ts.team.name}</span>
              </div>
              <div className="flex gap-1 flex-wrap">
                {DRIVERS.map((d) => (
                  <button
                    key={d}
                    onClick={() => setTeamDriver(ts.team.id, d)}
                    className={cn(
                      'text-xs px-2 py-0.5 rounded border transition-colors',
                      (params.teamDrivers[ts.team.id] ?? 'neutral') === d
                        ? 'bg-gray-900 text-white border-gray-900'
                        : 'border-gray-200 text-gray-600 hover:border-gray-400'
                    )}
                  >
                    {DRIVER_LABELS[d]}
                  </button>
                ))}
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-400">Priority</span>
                <input
                  type="range"
                  min={1}
                  max={5}
                  value={params.teamPriorityScore[ts.team.id] ?? 3}
                  onChange={(e) => setPriority(ts.team.id, +e.target.value)}
                  className="flex-1 accent-gray-900"
                />
                <span className="text-xs text-gray-600 w-3">
                  {params.teamPriorityScore[ts.team.id] ?? 3}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div>
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
          FTE Targets by Driver
        </p>
        <div className="space-y-1.5">
          {(['grow', 'contain', 'slim'] as BusinessDriver[]).map((d) => (
            <div key={d} className="flex items-center gap-2">
              <span className="text-xs text-gray-600 w-14">{DRIVER_LABELS[d]}</span>
              <input
                type="number"
                value={params.targetFteDelta[d] ?? 0}
                onChange={(e) => setFteDelta(d, +e.target.value)}
                className="w-16 border border-gray-200 rounded px-2 py-0.5 text-sm text-right"
                step={0.5}
              />
              <span className="text-xs text-gray-400">FTE delta</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <label className="text-xs font-medium text-gray-600">{label}</label>
      {children}
    </div>
  );
}
