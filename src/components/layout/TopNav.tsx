'use client';

import Link from 'next/link';
import { useWorkforceStore } from '@/lib/store/workforceStore';
import { ScenarioStats } from '@/components/scenarios/ScenarioStats';
import { useResetScenario } from '@/lib/hooks/useTeamBoard';
import type { BoardState } from '@/lib/types/domain';

const TYPE_LABELS = {
  squad_removal: 'Squad Removal',
  retirement_wave: 'Retirement Wave',
  business_drivers: 'Business Drivers',
};

interface TopNavProps {
  board?: BoardState;
}

export function TopNav({ board }: TopNavProps) {
  const { toggleParametersPanel, toggleSnapshotHistory } = useWorkforceStore();
  const resetMutation = useResetScenario(board?.scenario.id ?? '');

  return (
    <nav className="bg-white border-b border-gray-200 px-4 py-2.5 flex items-center gap-4 shrink-0">
      <Link
        href="/scenarios"
        className="text-gray-400 hover:text-gray-600 text-sm font-medium transition-colors"
      >
        ← Scenarios
      </Link>

      {board && (
        <>
          <div className="h-4 w-px bg-gray-200" />

          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="font-semibold text-gray-900 truncate">{board.scenario.name}</span>
              <span className="text-xs px-1.5 py-0.5 bg-gray-100 text-gray-500 rounded">
                {TYPE_LABELS[board.scenario.type]}
              </span>
            </div>
          </div>

          <div className="ml-4 hidden md:block">
            <ScenarioStats board={board} />
          </div>

          <div className="ml-auto flex items-center gap-2">
            <button
              onClick={toggleSnapshotHistory}
              className="text-sm px-3 py-1.5 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Snapshots
            </button>
            <button
              onClick={toggleParametersPanel}
              className="text-sm px-3 py-1.5 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Parameters
            </button>
            {board && (
              <button
                onClick={() => {
                  if (confirm('Reset all scenario changes?')) resetMutation.mutate();
                }}
                disabled={resetMutation.isPending}
                className="text-sm px-3 py-1.5 border border-red-200 text-red-600 rounded-lg hover:bg-red-50 disabled:opacity-40 transition-colors"
              >
                Reset
              </button>
            )}
            <Link
              href={`/scenarios/${board.scenario.id}/compare`}
              className="text-sm px-3 py-1.5 bg-gray-900 text-white rounded-lg hover:bg-gray-700 transition-colors"
            >
              Compare
            </Link>
          </div>
        </>
      )}

      {!board && (
        <div className="ml-auto">
          <Link
            href="/scenarios"
            className="font-semibold text-gray-900"
          >
            Workforce Planning
          </Link>
        </div>
      )}
    </nav>
  );
}
