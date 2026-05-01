'use client';

import { use } from 'react';
import { AppShell } from '@/components/layout/AppShell';
import { TeamBoard } from '@/components/teams/TeamBoard';
import { useBoardState } from '@/lib/hooks/useScenario';

interface ScenarioPageProps {
  params: Promise<{ scenarioId: string }>;
}

export default function ScenarioPage({ params }: ScenarioPageProps) {
  const { scenarioId } = use(params);
  const { data: board, isLoading, error } = useBoardState(scenarioId);

  return (
    <AppShell board={board}>
      {isLoading && (
        <div className="flex items-center justify-center py-20">
          <span className="text-gray-400">Loading board…</span>
        </div>
      )}

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700 text-sm">
          Failed to load scenario. {(error as Error).message}
        </div>
      )}

      {board && <TeamBoard board={board} />}
    </AppShell>
  );
}
