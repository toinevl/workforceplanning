import { AppShell } from '@/components/layout/AppShell';
import { ScenarioDashboard } from '@/components/scenarios/ScenarioDashboard';

export default function Home() {
  return (
    <AppShell>
      <ScenarioDashboard />
    </AppShell>
  );
}
