import { TableServiceClient, TableClient } from '@azure/data-tables';

let _serviceClient: TableServiceClient | null = null;

function getConnectionString(): string {
  const connectionString = process.env.AZURE_STORAGE_CONNECTION_STRING;
  if (!connectionString) {
    throw new Error('AZURE_STORAGE_CONNECTION_STRING environment variable is not set');
  }
  return connectionString;
}

export function getServiceClient(): TableServiceClient {
  if (!_serviceClient) {
    const cs = getConnectionString();
    const allowInsecure = cs.includes('127.0.0.1') || cs.includes('localhost');
    const clientOptions = allowInsecure ? { allowInsecureConnection: true } : undefined;
    _serviceClient = TableServiceClient.fromConnectionString(cs, clientOptions);
  }
  return _serviceClient;
}

export function getTableClient(tableName: string): TableClient {
  const cs = getConnectionString();
  const allowInsecure = cs.includes('127.0.0.1') || cs.includes('localhost');
  const clientOptions = allowInsecure ? { allowInsecureConnection: true } : undefined;
  return TableClient.fromConnectionString(cs, tableName, clientOptions);
}

export async function ensureTablesExist(): Promise<void> {
  const client = getServiceClient();
  const tables = [
    'teams',
    'staffMembers',
    'scenarios',
    'scenarioMemberStates',
    'scenarioTeamDrivers',
    'scenarioSnapshots',
  ];
  await Promise.all(
    tables.map((t) => client.createTable(t).catch(() => {}))
  );
}
