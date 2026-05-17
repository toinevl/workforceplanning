import { notFound } from 'next/navigation';
import Link from 'next/link';
import { AppShell } from '@/components/layout/AppShell';
import { CompareView } from '@/components/scenarios/CompareView';
import { getScenarioBoardState } from '@/lib/api/scenarios';

interface ComparePageProps {
  params: Promise<{ scenarioId: string }>;
}

export default async function ComparePage({ params }: ComparePageProps) {
  const { scenarioId } = await params;
  const board = await getScenarioBoardState(scenarioId);

  if (!board) {
    notFound();
  }

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
        <CompareView scenarioId={scenarioId} />
      </div>
    </AppShell>
  );
}
