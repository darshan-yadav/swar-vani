import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { queryByPK, getItem, updateItem } from '../lib/dynamo';
import { InventoryItem, UpdateInventoryRequest, ApiResponse } from '../lib/types';

const CORS_HEADERS = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET,PUT,OPTIONS',
};

function respond(statusCode: number, body: unknown): ApiResponse {
  return { statusCode, headers: CORS_HEADERS, body: JSON.stringify(body) };
}

/**
 * GET /inventory?storeId={storeId}   — list all inventory for a store
 * PUT /inventory/{productId}         — update stock level
 */
export async function handler(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
  try {
    if (event.httpMethod === 'OPTIONS') {
      return respond(200, {});
    }

    if (event.httpMethod === 'GET') {
      return handleGetInventory(event);
    }

    if (event.httpMethod === 'PUT') {
      return handleUpdateInventory(event);
    }

    return respond(405, { error: 'Method not allowed' });
  } catch (error) {
    console.error('Inventory error:', error);
    return respond(500, { error: 'Internal server error' });
  }
}

async function handleGetInventory(event: APIGatewayProxyEvent): Promise<ApiResponse> {
  const storeId = event.queryStringParameters?.storeId;

  if (!storeId) {
    return respond(400, { error: 'Query parameter "storeId" is required' });
  }

  const items = await queryByPK(`STORE#${storeId}`, 'INV#');

  const inventory = items.map((item) => {
    // DynamoDB uses snake_case field names
    const productId = (item as any).product_id as string;
    const stock = Number((item as any).stock) || 0;
    const reorderPoint = Number((item as any).reorder_point) || 0;
    const avgDailySales = Number((item as any).avg_daily_sales) || 0;
    const lastRestocked = (item as any).last_restocked as string | undefined;
    const lowStock = stock <= reorderPoint;
    return {
      productId,
      stock,
      reorderPoint,
      avgDailySales,
      lowStock,
      daysOfStock: avgDailySales > 0 ? Math.floor(stock / avgDailySales) : null,
      lastRestocked,
    };
  });

  const lowStockCount = inventory.filter((i) => i.lowStock).length;

  return respond(200, {
    storeId,
    inventory,
    totalItems: inventory.length,
    lowStockCount,
    lowStockItems: inventory.filter((i) => i.lowStock),
  });
}

async function handleUpdateInventory(event: APIGatewayProxyEvent): Promise<ApiResponse> {
  const productId = event.pathParameters?.productId;

  if (!productId) {
    return respond(400, { error: 'Path parameter "productId" is required' });
  }

  const body: UpdateInventoryRequest = JSON.parse(event.body || '{}');

  if (!body.storeId || body.quantity === undefined) {
    return respond(400, { error: 'Body must include "storeId" and "quantity"' });
  }

  // Verify inventory item exists
  const existing = await getItem<Record<string, unknown>>(`STORE#${body.storeId}`, `INV#${productId}`);

  if (!existing) {
    return respond(404, { error: `Inventory item not found for store ${body.storeId}, product ${productId}` });
  }

  await updateItem(`STORE#${body.storeId}`, `INV#${productId}`, {
    stock: body.quantity,
    last_restocked: new Date().toISOString(),
  });

  const reorderPoint = Number(existing.reorder_point) || 0;
  const lowStock = body.quantity <= reorderPoint;

  return respond(200, {
    productId,
    storeId: body.storeId,
    stock: body.quantity,
    reorderPoint,
    lowStock,
    message: lowStock
      ? '⚠️ Stock is below reorder point!'
      : '✅ Inventory updated successfully',
  });
}
