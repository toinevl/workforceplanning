import { TableServiceClient, TableClient, type TableServiceClientOptions } from '@azure/data-tables';

let _serviceClient: TableServiceClient | null = null;
let _fallbackUsed = false;

export function isUsingEmulatorFallback(): boolean {
  return _fallbackUsed;
}

export function getConnectionString(): string {
  return process.env.AZURE_STORAGE_CONNECTION_STRING ?? 'UseDevelopmentStorage=true';
}

function getClientOptions(connectionString: string): TableServiceClientOptions {
  const isLocal =
    connectionString === 'UseDevelopmentStorage=true' ||
    connectionString.includes('127.0.0.1') ||
    connectionString.includes('localhost');

  return {
    allowInsecureConnection: isLocal,
    retryOptions: {
      maxRetries: isLocal ? 1 : 3,
      retryDelayInMs: isLocal ? 250 : 1_000,
      maxRetryDelayInMs: isLocal ? 1_000 : 64_000,
    },
  };
}

export function getServiceClient(): TableServiceClient {
  if (!_serviceClient) {
    const cs = getConnectionString();
    _serviceClient = TableServiceClient.fromConnectionString(cs, getClientOptions(cs));
  }
  return _serviceClient;
}

export function getTableClient(tableName: string): TableClient {
  const cs = getConnectionString();
  return TableClient.fromConnectionString(cs, tableName, getClientOptions(cs));
}

export async function ensureTablesExist(): Promise<void> {
  const client = getServiceClient();
  const tables = [
    'departments',
    'teams',
    'staffMembers',
    'scenarios',
    'scenarioMemberStates',
    'scenarioTeamDrivers',
    'scenarioSnapshots',
    'scenarioAuditEvents',
  ];

  const results = await Promise.allSettled(
    tables.map((t) => client.createTable(t))
  );

  const failed = results
    .map((result, index) => ({ result, table: tables[index] }))
    .filter(({ result }) => result.status === 'rejected');

  if (failed.length === tables.length && process.env.E2E_ALLOW_EMULATOR_FALLBACK === 'true') {
    _fallbackUsed = true;
    return;
  }

  const errors = failed.map(({ result, table }) => `${table}: ${(result as PromiseRejectedResult).reason}`);
  if (errors.length) {
    throw new Error(`Failed to ensure tables exist: ${errors.join(' | ')}`);
  }
}
