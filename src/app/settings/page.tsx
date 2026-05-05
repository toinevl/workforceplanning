'use client';

import Link from 'next/link';
import { AppShell } from '@/components/layout/AppShell';
import { SeedSetupPanel } from '@/components/scenarios/SeedSetupPanel';
import { useSeed } from '@/lib/hooks/useScenario';

export default function SettingsPage() {
  const seedMutation = useSeed();

  return (
    <AppShell>
      <div className="max-w-6xl mx-auto py-6 px-4">
        <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
            <p className="mt-1 text-sm text-gray-600">
              Configure team setup and generate sample workforce data.
            </p>
          </div>
          <Link
            href="/"
            className="text-sm px-4 py-2 border border-gray-400 text-gray-800 rounded-lg hover:bg-gray-50 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-500"
          >
            Back to Home
          </Link>
        </div>

        <SeedSetupPanel
          isPending={seedMutation.isPending}
          result={seedMutation.data}
          error={seedMutation.error}
          onSeed={(teams, resetFirst) => {
            if (!resetFirst || confirm('Reset all model data and reseed with this team setup?')) {
              seedMutation.mutate({ teams, resetFirst });
            }
          }}
        />

        {seedMutation.isSuccess && (
          <div className="mt-4 rounded-lg border border-emerald-300 bg-emerald-50 p-4 text-sm text-emerald-900">
            Sample data is ready.{' '}
            <Link href="/" className="font-medium underline underline-offset-2">
              Return to scenarios
            </Link>
            .
          </div>
        )}
      </div>
    </AppShell>
  );
}
