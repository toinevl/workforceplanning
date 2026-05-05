'use client';

import { use } from 'react';
import Link from 'next/link';
import { AppShell } from '@/components/layout/AppShell';
import { CompareView } from '@/components/scenarios/CompareView';
import { useBoardState } from '@/lib/hooks/useScenario';

interface ComparePageProps {
  params: Promise<{ scenarioId: string }>;
}

export default function ComparePage({ params }: ComparePageProps) {
  const { scenarioId } = use(params);
  const { data: board, isLoading } = useBoardState(scenarioId);

  return (
    <AppShell board={board}>
      <div className="max-w-screen-2xl mx-auto">
        <Link
          href={`/scenarios/${scenarioId}`}
          className="mb-4 inline-flex text-sm font-medium text-gray-600 transition-colors hover:text-gray-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-500"
        >
          Back to Board
        </Link>
        <h1 className="mb-4 text-xl font-semibold text-gray-900">Compare View</h1>
        {isLoading && (
          <div className="flex items-center justify-center py-20">
            <span className="text-gray-600">Loading...</span>
          </div>
        )}
        {!isLoading && <CompareView scenarioId={scenarioId} />}
      </div>
    </AppShell>
  );
}
