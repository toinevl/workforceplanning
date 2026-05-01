import { TableServiceClient, TableClient } from '@azure/data-tables';

const connectionString = process.env.AZURE_STORAGE_CONNECTION_STRING;

if (!connectionString) {
  throw new Error('AZURE_STORAGE_CONNECTION_STRING environment variable is not set');
}

const allowInsecure = connectionString.includes('127.0.0.1') || connectionString.includes('localhost');
const clientOptions = allowInsecure ? { allowInsecureConnection: true } : undefined;

let _serviceClient: TableServiceClient | null = null;

export function getServiceClient(): TableServiceClient {
  if (!_serviceClient) {
    _serviceClient = TableServiceClient.fromConnectionString(connectionString!, clientOptions);
  }
  return _serviceClient;
}

export function getTableClient(tableName: string): TableClient {
  return TableClient.fromConnectionString(connectionString!, tableName, clientOptions);
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
