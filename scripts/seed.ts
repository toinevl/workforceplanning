// Seed the production database directly via the Azure Table Storage SDK.
// Bypasses the web layer entirely — no HTTP, no auth middleware.
//
// Usage:
//   AZURE_STORAGE_CONNECTION_STRING="..." npx tsx scripts/seed.ts
//
// Options:
//   --no-reset    Do not wipe existing data first (default: resets)
//   --members N   Limit members per team (default: all)

import { runSeed } from '../src/lib/db/seed';

async function main() {
  const args = process.argv.slice(2);
  const noReset = args.includes('--no-reset');
  const membersIdx = args.indexOf('--members');
  const membersPerTeam =
    membersIdx >= 0 && args[membersIdx + 1]
      ? parseInt(args[membersIdx + 1], 10)
      : undefined;

  if (!process.env.AZURE_STORAGE_CONNECTION_STRING) {
    console.error('AZURE_STORAGE_CONNECTION_STRING is not set');
    process.exit(1);
  }

  console.log('Seeding database...');
  if (!noReset) console.log('  (resetFirst: true — existing data will be wiped)');
  if (membersPerTeam) console.log(`  (membersPerTeam: ${membersPerTeam})`);

  const result = await runSeed({
    resetFirst: !noReset,
    membersPerTeam,
  });

  console.log('Seed complete:', JSON.stringify(result, null, 2));
}

main().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});
