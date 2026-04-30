// Run with: npx tsx scripts/seed-dev.ts
// Seeds the local Azurite database with initial data

import 'dotenv/config';

async function main() {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
  const res = await fetch(`${baseUrl}/api/seed`, { method: 'POST' });
  const data = await res.json();
  console.log('Seed result:', JSON.stringify(data, null, 2));
}

main().catch(console.error);
