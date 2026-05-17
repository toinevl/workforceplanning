import { notFound } from 'next/navigation';
import { AppShell } from '@/components/layout/AppShell';
import { TeamBoard } from '@/components/teams/TeamBoard';
import { getScenarioBoardState } from '@/lib/api/scenarios';

interface ScenarioPageProps {
  params: Promise<{ scenarioId: string }>;
}

export default async function ScenarioPage({ params }: ScenarioPageProps) {
  const { scenarioId } = await params;
  const board = await getScenarioBoardState(scenarioId);

  if (!board) {
    notFound();
  }

  return (
    <AppShell board={board}>
      <TeamBoard board={board} />
    </AppShell>
  );
}
