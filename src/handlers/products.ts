import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, QueryCommand } from '@aws-sdk/lib-dynamodb';

const TABLE_NAME = process.env.TABLE_NAME || 'swar-vani-data';
const client = new DynamoDBClient({ region: process.env.AWS_REGION || 'us-east-1' });
const docClient = DynamoDBDocumentClient.from(client, { marshallOptions: { removeUndefinedValues: true } });

const CORS_HEADERS = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET,OPTIONS',
};

function respond(statusCode: number, body: unknown) {
  return { statusCode, headers: CORS_HEADERS, body: JSON.stringify(body) };
}

export async function handler(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
  try {
    if (event.httpMethod === 'OPTIONS') return respond(200, {});

    const query = event.queryStringParameters?.q?.trim();
    if (!query) return respond(400, { error: 'Query parameter "q" is required' });

    const queryLower = query.toLowerCase();

    // GSI1 is an inverted index: GSI1PK = SK, GSI1SK = PK
    // Product meta items have SK = 'META', PK = 'PRODUCT#xxx'
    // So on GSI1: partition key 'META', sort key starts with 'PRODUCT#'
    const result = await docClient.send(new QueryCommand({
      TableName: TABLE_NAME,
      IndexName: 'GSI1',
      KeyConditionExpression: 'SK = :sk AND begins_with(PK, :pkPrefix)',
      ExpressionAttributeValues: { ':sk': 'META', ':pkPrefix': 'PRODUCT#' },
    }));

    const allProducts = (result.Items || []) as Record<string, unknown>[];

    const matched = allProducts.filter((item) => {
      const nameEn = ((item.name_en as string) || '').toLowerCase();
      const nameHi = (item.name_hi as string) || '';
      const category = ((item.category as string) || '').toLowerCase();
      const barcode = (item.barcode as string) || '';
      return nameEn.includes(queryLower) || nameHi.includes(query) || category.includes(queryLower) || barcode.includes(query);
    }).slice(0, 10);

    const products = matched.map((item) => ({
      productId: item.product_id,
      nameEn: item.name_en,
      nameHi: item.name_hi,
      category: item.category,
      unit: item.unit,
      barcode: item.barcode,
    }));

    return respond(200, { products, count: products.length });
  } catch (error) {
    console.error('Product search error:', error);
    return respond(500, { error: 'Internal server error', detail: String(error) });
  }
}
