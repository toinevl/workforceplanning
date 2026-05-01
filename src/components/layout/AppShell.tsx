'use client';

import { useWorkforceStore } from '@/lib/store/workforceStore';
import { TopNav } from './TopNav';
import { ParametersPanel } from '@/components/scenarios/ParametersPanel';
import { SnapshotHistory } from '@/components/scenarios/SnapshotHistory';
import type { BoardState } from '@/lib/types/domain';

interface AppShellProps {
  board?: BoardState;
  children: React.ReactNode;
}

export function AppShell({ board, children }: AppShellProps) {
  const {
    isParametersPanelOpen,
    isSnapshotHistoryOpen,
    setParametersPanelOpen,
    setSnapshotHistoryOpen,
  } = useWorkforceStore();

  return (
    <div className="flex flex-col h-full min-h-screen">
      <TopNav board={board} />

      <div className="flex flex-1 overflow-hidden">
        <main className="flex-1 overflow-y-auto p-4">
          {children}
        </main>

        {board && isParametersPanelOpen && (
          <ParametersPanel
            board={board}
            onClose={() => setParametersPanelOpen(false)}
          />
        )}

        {board && isSnapshotHistoryOpen && (
          <SnapshotHistory
            scenarioId={board.scenario.id}
            onClose={() => setSnapshotHistoryOpen(false)}
          />
        )}
      </div>
    </div>
  );
}
