'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';
import { useWorkforceStore } from '@/lib/store/workforceStore';
import { ScenarioStats } from '@/components/scenarios/ScenarioStats';
import { useResetScenario } from '@/lib/hooks/useTeamBoard';
import { APP_NAME, APP_VERSION, BUILD_TIME, GIT_COMMIT } from '@/lib/appInfo';
import type { BoardState } from '@/lib/types/domain';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';

const TYPE_LABELS = {
  squad_removal: 'Squad Removal',
  retirement_wave: 'Retirement Wave',
  business_drivers: 'Business Drivers',
};

interface TopNavProps {
  board?: BoardState;
}

export function TopNav({ board }: TopNavProps) {
  const pathname = usePathname();
  const { toggleParametersPanel, toggleSnapshotHistory, togglePapertrail } = useWorkforceStore();
  const resetMutation = useResetScenario(board?.scenario.id ?? '');
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const isHome = pathname === '/' || pathname === '/scenarios';
  const isSettings = pathname === '/settings';
  const isDepartments = pathname.startsWith('/departments');

  return (
    <nav className="bg-white border-b border-gray-200 px-4 py-2.5 flex flex-wrap items-center gap-3 shrink-0">
      <div className="flex min-w-0 items-center gap-2">
        <Link
          href="/"
          className="font-semibold text-gray-950 transition-colors hover:text-gray-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-500"
        >
          {APP_NAME}
        </Link>
        <span
          suppressHydrationWarning
          title={BUILD_TIME ? `Built ${new Date(BUILD_TIME).toLocaleTimeString()}` : undefined}
          className="rounded border border-gray-300 bg-gray-50 px-1.5 py-0.5 text-xs font-medium text-gray-700 cursor-default"
        >
          v{APP_VERSION}{GIT_COMMIT ? ` (${GIT_COMMIT})` : ''}
        </span>
      </div>

      <div className="flex items-center gap-1">
        <Link
          href="/"
          aria-current={isHome ? 'page' : undefined}
          className="rounded px-2.5 py-2.5 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 hover:text-gray-950 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-500 aria-[current=page]:bg-gray-100 aria-[current=page]:text-gray-950"
        >
          Home
        </Link>
        <Link
          href="/settings"
          aria-current={isSettings ? 'page' : undefined}
          className="rounded px-2.5 py-2.5 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 hover:text-gray-950 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-500 aria-[current=page]:bg-gray-100 aria-[current=page]:text-gray-950"
        >
          Settings
        </Link>
        <Link
          href="/departments"
          aria-current={isDepartments ? 'page' : undefined}
          className="rounded px-2.5 py-2.5 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 hover:text-gray-950 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-500 aria-[current=page]:bg-gray-100 aria-[current=page]:text-gray-950"
        >
          Departments
        </Link>
      </div>

      {board && (
        <>
          <div className="h-4 w-px bg-gray-200" />

          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="font-semibold text-gray-900 truncate">{board.scenario.name}</span>
              <span className="text-xs px-1.5 py-0.5 bg-gray-100 text-gray-700 rounded">
                {TYPE_LABELS[board.scenario.type]}
              </span>
            </div>
          </div>

          <div className="ml-4 hidden md:block">
            <ScenarioStats board={board} />
          </div>

          <div className="ml-auto flex flex-wrap items-center gap-2">
            <button
              onClick={toggleSnapshotHistory}
              className="text-sm px-3 py-2.5 border border-gray-400 text-gray-800 rounded-lg hover:bg-gray-50 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-500"
            >
              Snapshots
            </button>
            <button
              onClick={togglePapertrail}
              className="text-sm px-3 py-2.5 border border-gray-400 text-gray-800 rounded-lg hover:bg-gray-50 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-500"
            >
              Papertrail
            </button>
            <button
              onClick={toggleParametersPanel}
              className="text-sm px-3 py-2.5 border border-gray-400 text-gray-800 rounded-lg hover:bg-gray-50 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-500"
            >
              Parameters
            </button>
            {board && (
              <button
                onClick={() => setShowResetConfirm(true)}
                disabled={resetMutation.isPending}
                className="text-sm px-3 py-2.5 border border-red-500 text-red-700 rounded-lg hover:bg-red-50 disabled:opacity-40 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500"
              >
                Reset
              </button>
            )}
            <Link
              href={`/scenarios/${board.scenario.id}/compare`}
              className="text-sm px-3 py-2.5 bg-gray-900 text-white rounded-lg hover:bg-gray-700 transition-colors"
            >
              Compare
            </Link>
          </div>
        </>
      )}

      <ConfirmDialog
        open={showResetConfirm}
        title="Reset scenario changes?"
        description="This will discard the current scenario edits and restore the scenario to its saved state."
        confirmLabel="Reset"
        pending={resetMutation.isPending}
        error={resetMutation.isError ? (resetMutation.error as Error).message : null}
        onClose={() => setShowResetConfirm(false)}
        onConfirm={() => {
          resetMutation.mutate(undefined, {
            onSuccess: () => setShowResetConfirm(false),
          });
        }}
      />
    </nav>
  );
}
