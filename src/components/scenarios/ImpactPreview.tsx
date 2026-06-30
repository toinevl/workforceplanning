'use client';

import { useMemo } from 'react';
import type { BoardState } from '@/lib/types/domain';
import type { SquadRemovalParams, RetirementWaveParams, BusinessDriverParams } from '@/lib/types/params';
import { computeSquadRemoval } from '@/lib/scenarios/squad-removal';
import { analyzeRetirementWave } from '@/lib/scenarios/retirement-wave';
import { analyzeBusinessDrivers } from '@/lib/scenarios/business-drivers';

interface ImpactPreviewProps {
  board: BoardState;
  params: SquadRemovalParams | RetirementWaveParams | BusinessDriverParams;
}

/**
 * Shows a compact quantitative preview of what applying the current scenario
 * logic will do — members removed, FTE impact, suggested moves — before the
 * user commits by clicking "Apply Logic".
 */
export function ImpactPreview({ board, params }: ImpactPreviewProps) {
  const preview = useMemo(() => computePreview(board, params), [board, params]);

  if (!preview) return null;

  return (
    <div className="rounded-lg border border-gray-200 bg-gray-50 p-3 space-y-2">
      <p className="text-xs font-semibold text-gray-700 uppercase tracking-wide">
        Impact Preview
      </p>
      <div className="grid grid-cols-2 gap-2">
        {preview.metrics.map((m) => (
          <div key={m.label} className="flex flex-col">
            <span className="text-lg font-semibold text-gray-900 tabular-nums">
              {m.value}
            </span>
            <span className="text-xs text-gray-500">{m.label}</span>
          </div>
        ))}
      </div>
      {preview.note && (
        <p className="text-xs text-gray-500 pt-1 border-t border-gray-200">{preview.note}</p>
      )}
    </div>
  );
}

interface PreviewResult {
  metrics: Array<{ label: string; value: string }>;
  note?: string;
}

function computePreview(
  board: BoardState,
  params: SquadRemovalParams | RetirementWaveParams | BusinessDriverParams
): PreviewResult | null {
  const allMembers = board.teams.flatMap((t) => t.members);
  const teams = board.teams.map((t) => t.team);

  if (board.scenario.type === 'squad_removal') {
    const { toRemove } = computeSquadRemoval(allMembers, params as SquadRemovalParams);
    const fteRemoved = toRemove.reduce((sum, r) => {
      const m = allMembers.find((mem) => mem.id === r.memberId);
      return sum + (m?.fte ?? 0);
    }, 0);
    return {
      metrics: [
        { label: 'Members removed', value: String(toRemove.length) },
        { label: 'FTE removed', value: fteRemoved.toFixed(1) },
        { label: 'Remaining HC', value: String(allMembers.length - toRemove.length) },
        {
          label: 'Remaining FTE',
          value: (board.totalFte - fteRemoved).toFixed(1),
        },
      ],
      note:
        toRemove.length === 0
          ? 'No members selected — all SQUAD members will be removed by default.'
          : undefined,
    };
  }

  if (board.scenario.type === 'retirement_wave') {
    const analysis = analyzeRetirementWave(allMembers, teams, board.teams, params as RetirementWaveParams);
    const atRiskCount = analysis.withinHorizon.length;
    return {
      metrics: [
        { label: 'At-risk members', value: String(atRiskCount) },
        { label: 'FTE at risk', value: analysis.totalFteAtRisk.toFixed(1) },
        { label: 'Immediate risk', value: String(analysis.byTier.immediate.length) },
        {
          label: `Within ${(params as RetirementWaveParams).horizonYears}y`,
          value: String(atRiskCount),
        },
      ],
      note: 'Retirement wave flags at-risk members but does not auto-remove them.',
    };
  }

  if (board.scenario.type === 'business_drivers') {
    const analysis = analyzeBusinessDrivers(teams, board.teams, params as BusinessDriverParams);
    const growCount = analysis.teamsByDriver.grow.length;
    const slimCount = analysis.teamsByDriver.slim.length;
    return {
      metrics: [
        { label: 'Suggested moves', value: String(analysis.suggestedMoves.length) },
        {
          label: 'Move FTE',
          value: analysis.suggestedMoves.reduce((s, m) => s + m.fte, 0).toFixed(1),
        },
        { label: 'Grow teams', value: String(growCount) },
        { label: 'Slim teams', value: String(slimCount) },
      ],
      note:
        analysis.suggestedMoves.length === 0
          ? 'No transfers suggested — check driver assignments and FTE targets.'
          : `${analysis.suggestedMoves.length} transfer(s) suggested from slim to grow teams.`,
    };
  }

  return null;
}
