import { AppShell } from '@/components/layout/AppShell';
import { OrgDashboard } from '@/components/org/OrgDashboard';

export default function Home() {
  return (
    <AppShell>
      <OrgDashboard />
    </AppShell>
  );
}
