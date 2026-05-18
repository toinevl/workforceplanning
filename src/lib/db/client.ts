import { TableServiceClient, TableClient, type TableServiceClientOptions } from '@azure/data-tables';

let _serviceClient: TableServiceClient | null = null;

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
  await Promise.all(
    tables.map((t) => client.createTable(t).catch(() => {}))
  );
}
