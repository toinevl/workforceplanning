'use client';

import { use } from 'react';
import Link from 'next/link';
import { CompareView } from '@/components/scenarios/CompareView';
import { useBoardState } from '@/lib/hooks/useScenario';

interface ComparePageProps {
  params: Promise<{ scenarioId: string }>;
}

export default function ComparePage({ params }: ComparePageProps) {
  const { scenarioId } = use(params);
  const { data: board, isLoading } = useBoardState(scenarioId);

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white border-b border-gray-200 px-4 py-2.5 flex items-center gap-3">
        <Link
          href={`/scenarios/${scenarioId}`}
          className="text-gray-400 hover:text-gray-600 text-sm font-medium transition-colors"
        >
          ← Back to Board
        </Link>
        {board && (
          <>
            <div className="h-4 w-px bg-gray-200" />
            <span className="font-semibold text-gray-900">{board.scenario.name}</span>
            <span className="text-gray-400 text-sm">— Compare View</span>
          </>
        )}
      </nav>

      <div className="max-w-screen-2xl mx-auto p-4">
        {isLoading && (
          <div className="flex items-center justify-center py-20">
            <span className="text-gray-400">Loading…</span>
          </div>
        )}
        {!isLoading && <CompareView scenarioId={scenarioId} />}
      </div>
    </div>
  );
}
