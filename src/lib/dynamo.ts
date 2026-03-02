import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import {
  DynamoDBDocumentClient,
  GetCommand,
  PutCommand,
  QueryCommand,
  UpdateCommand,
  ScanCommand,
  BatchWriteCommand,
} from '@aws-sdk/lib-dynamodb';

const TABLE_NAME = process.env.TABLE_NAME || 'swar-vani-data';
const REGION = process.env.AWS_REGION || 'us-east-1';

const client = new DynamoDBClient({ region: REGION });
export const docClient = DynamoDBDocumentClient.from(client, {
  marshallOptions: { removeUndefinedValues: true },
});

// ─── Helpers ───

export async function getItem<T>(pk: string, sk: string): Promise<T | undefined> {
  const result = await docClient.send(
    new GetCommand({ TableName: TABLE_NAME, Key: { PK: pk, SK: sk } })
  );
  return result.Item as T | undefined;
}

export async function putItem(item: Record<string, unknown>): Promise<void> {
  const now = new Date().toISOString();
  await docClient.send(
    new PutCommand({
      TableName: TABLE_NAME,
      Item: {
        ...item,
        createdAt: item.createdAt || now,
        updatedAt: now,
      },
    })
  );
}

export async function queryByPK(
  pk: string,
  skPrefix?: string,
  options?: { limit?: number; scanIndexForward?: boolean }
): Promise<Record<string, unknown>[]> {
  const params: Record<string, unknown> = {
    TableName: TABLE_NAME,
    KeyConditionExpression: skPrefix
      ? 'PK = :pk AND begins_with(SK, :sk)'
      : 'PK = :pk',
    ExpressionAttributeValues: skPrefix
      ? { ':pk': pk, ':sk': skPrefix }
      : { ':pk': pk },
  };

  if (options?.limit) params.Limit = options.limit;
  if (options?.scanIndexForward !== undefined) params.ScanIndexForward = options.scanIndexForward;

  const result = await docClient.send(new QueryCommand(params as any));
  return (result.Items || []) as Record<string, unknown>[];
}

export async function queryGSI1(
  sk: string,
  pkPrefix?: string
): Promise<Record<string, unknown>[]> {
  const params: Record<string, unknown> = {
    TableName: TABLE_NAME,
    IndexName: 'GSI1',
    KeyConditionExpression: pkPrefix
      ? 'SK = :sk AND begins_with(PK, :pk)'
      : 'SK = :sk',
    ExpressionAttributeValues: pkPrefix
      ? { ':sk': sk, ':pk': pkPrefix }
      : { ':sk': sk },
  };

  const result = await docClient.send(new QueryCommand(params as any));
  return (result.Items || []) as Record<string, unknown>[];
}

export async function scanWithFilter(
  filterExpression: string,
  expressionAttributeValues: Record<string, unknown>,
  expressionAttributeNames?: Record<string, string>,
  limit?: number
): Promise<Record<string, unknown>[]> {
  const params: any = {
    TableName: TABLE_NAME,
    FilterExpression: filterExpression,
    ExpressionAttributeValues: expressionAttributeValues,
  };
  if (expressionAttributeNames) {
    params.ExpressionAttributeNames = expressionAttributeNames;
  }
  if (limit) {
    // Note: Scan limit is on items read, not returned. We'll collect up to limit matches.
  }

  const items: Record<string, unknown>[] = [];
  let lastKey: Record<string, unknown> | undefined;

  do {
    if (lastKey) params.ExclusiveStartKey = lastKey;
    const result = await docClient.send(new ScanCommand(params));
    items.push(...((result.Items || []) as Record<string, unknown>[]));
    lastKey = result.LastEvaluatedKey as Record<string, unknown> | undefined;
  } while (lastKey && (!limit || items.length < limit));

  return limit ? items.slice(0, limit) : items;
}

export async function updateItem(
  pk: string,
  sk: string,
  updates: Record<string, unknown>
): Promise<void> {
  const keys = Object.keys(updates);
  if (keys.length === 0) return;

  const expressionParts: string[] = ['#updatedAt = :updatedAt'];
  const attrNames: Record<string, string> = { '#updatedAt': 'updatedAt' };
  const attrValues: Record<string, unknown> = { ':updatedAt': new Date().toISOString() };

  keys.forEach((key, i) => {
    expressionParts.push(`#field${i} = :val${i}`);
    attrNames[`#field${i}`] = key;
    attrValues[`:val${i}`] = updates[key];
  });

  await docClient.send(
    new UpdateCommand({
      TableName: TABLE_NAME,
      Key: { PK: pk, SK: sk },
      UpdateExpression: `SET ${expressionParts.join(', ')}`,
      ExpressionAttributeNames: attrNames,
      ExpressionAttributeValues: attrValues,
    })
  );
}

export async function batchWrite(items: Record<string, unknown>[]): Promise<void> {
  const now = new Date().toISOString();
  // DynamoDB batch write max 25 items
  const batches: Record<string, unknown>[][] = [];
  for (let i = 0; i < items.length; i += 25) {
    batches.push(items.slice(i, i + 25));
  }

  for (const batch of batches) {
    await docClient.send(
      new BatchWriteCommand({
        RequestItems: {
          [TABLE_NAME]: batch.map((item) => ({
            PutRequest: {
              Item: {
                ...item,
                createdAt: (item.createdAt as string) || now,
                updatedAt: now,
              },
            },
          })),
        },
      })
    );
  }
}

export { TABLE_NAME };
