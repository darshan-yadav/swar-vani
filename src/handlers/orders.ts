import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { queryByPK, getItem, putItem, updateItem } from '../lib/dynamo';
import {
  Order,
  OrderLineItem,
  ProductPrice,
  CreateOrderRequest,
  ApiResponse,
} from '../lib/types';
import { ulid } from 'ulid';

const CORS_HEADERS = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
};

function respond(statusCode: number, body: unknown): ApiResponse {
  return { statusCode, headers: CORS_HEADERS, body: JSON.stringify(body) };
}

/**
 * POST /orders           — create draft order
 * POST /orders/{id}/confirm — confirm order
 * GET  /orders?storeId=  — order history
 */
export async function handler(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
  try {
    if (event.httpMethod === 'OPTIONS') {
      return respond(200, {});
    }

    const path = event.path || '';

    // POST /orders/{id}/confirm
    if (event.httpMethod === 'POST' && path.endsWith('/confirm')) {
      return handleConfirmOrder(event);
    }

    // POST /orders
    if (event.httpMethod === 'POST') {
      return handleCreateOrder(event);
    }

    // GET /orders?storeId=
    if (event.httpMethod === 'GET') {
      return handleGetOrders(event);
    }

    return respond(405, { error: 'Method not allowed' });
  } catch (error) {
    console.error('Orders error:', error);
    return respond(500, { error: 'Internal server error' });
  }
}

async function handleCreateOrder(event: APIGatewayProxyEvent): Promise<ApiResponse> {
  const body: CreateOrderRequest = JSON.parse(event.body || '{}');

  if (!body.storeId || !body.items || body.items.length === 0) {
    return respond(400, { error: 'Body must include "storeId" and non-empty "items" array' });
  }

  const orderId = ulid();
  const lineItems: OrderLineItem[] = [];
  let totalAmount = 0;

  // Look up pricing for each item
  for (const item of body.items) {
    const priceData = await getItem<Record<string, unknown>>(
      `PRODUCT#${item.productId}`,
      `PRICE#${item.supplierId}`
    );

    const unitPrice = Number(priceData?.price) || 0;
    const lineTotal = unitPrice * item.quantity;
    totalAmount += lineTotal;

    // Also fetch product name (DB uses snake_case: name_en)
    const productMeta = await getItem<Record<string, unknown>>(
      `PRODUCT#${item.productId}`,
      'META'
    );

    lineItems.push({
      productId: item.productId,
      productName: (productMeta?.name_en as string) || item.productId,
      quantity: item.quantity,
      supplierId: item.supplierId,
      unitPrice,
      lineTotal,
    });
  }

  const order: Record<string, unknown> = {
    PK: `STORE#${body.storeId}`,
    SK: `ORDER#${orderId}`,
    GSI1PK: `ORDER#${orderId}`,
    GSI1SK: `STORE#${body.storeId}`,
    GSI2PK: 'ORDER#DRAFT',
    GSI2SK: new Date().toISOString(),
    entityType: 'ORDER',
    storeId: body.storeId,
    orderId,
    items: lineItems,
    totalAmount,
    status: 'DRAFT',
  };

  await putItem(order);

  return respond(201, {
    orderId,
    storeId: body.storeId,
    items: lineItems,
    totalAmount,
    status: 'DRAFT',
    message: `Order created with ${lineItems.length} items totaling ₹${totalAmount.toFixed(2)}. Confirm to place.`,
  });
}

async function handleConfirmOrder(event: APIGatewayProxyEvent): Promise<ApiResponse> {
  const orderId = event.pathParameters?.id;

  if (!orderId) {
    return respond(400, { error: 'Order ID is required' });
  }

  const storeId = event.queryStringParameters?.storeId ||
    JSON.parse(event.body || '{}').storeId;

  if (!storeId) {
    return respond(400, { error: '"storeId" is required' });
  }

  const existing = await getItem<Order>(`STORE#${storeId}`, `ORDER#${orderId}`);

  if (!existing) {
    return respond(404, { error: `Order ${orderId} not found` });
  }

  if (existing.status !== 'DRAFT') {
    return respond(400, { error: `Order is already ${existing.status}, cannot confirm` });
  }

  await updateItem(`STORE#${storeId}`, `ORDER#${orderId}`, {
    status: 'CONFIRMED',
    confirmedAt: new Date().toISOString(),
    GSI2PK: 'ORDER#CONFIRMED',
    GSI2SK: new Date().toISOString(),
  });

  return respond(200, {
    orderId,
    status: 'CONFIRMED',
    message: '✅ Order confirmed! Supplier has been notified.',
  });
}

async function handleGetOrders(event: APIGatewayProxyEvent): Promise<ApiResponse> {
  const storeId = event.queryStringParameters?.storeId;

  if (!storeId) {
    return respond(400, { error: 'Query parameter "storeId" is required' });
  }

  const items = await queryByPK(`STORE#${storeId}`, 'ORDER#', {
    scanIndexForward: false, // newest first
  });

  const orders = items.map((item) => ({
    orderId: item.orderId || item.order_id,
    status: item.status,
    totalAmount: item.totalAmount || item.total,
    items: item.items,
    createdAt: item.createdAt || item.created_at,
    confirmedAt: item.confirmedAt || item.confirmed_at,
    deliveredAt: item.deliveredAt || item.delivered_at,
  }));

  return respond(200, { storeId, orders, count: orders.length });
}
