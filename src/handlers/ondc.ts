import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import {
  syncCatalogToOndc,
  getOndcCatalog,
  getOndcOrders,
  getOndcStats,
  generateMockOndcOrders,
} from '../lib/ondc-mock';

const CORS_HEADERS = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
};

function respond(statusCode: number, body: unknown): APIGatewayProxyResult {
  return { statusCode, headers: CORS_HEADERS, body: JSON.stringify(body) };
}

/**
 * ONDC Mock Integration endpoints:
 *   GET  /ondc/catalog?storeId=store-001  — ONDC catalog for store
 *   GET  /ondc/orders?storeId=store-001   — ONDC orders for store
 *   POST /ondc/sync                       — trigger catalog sync
 *   GET  /ondc/stats?storeId=store-001    — ONDC dashboard stats
 */
export async function handler(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
  try {
    if (event.httpMethod === 'OPTIONS') return respond(200, {});

    const path = event.resource || event.path || '';
    const method = event.httpMethod;

    // Route: GET /ondc/catalog
    if (method === 'GET' && path.includes('/catalog')) {
      return handleGetCatalog(event);
    }

    // Route: GET /ondc/orders
    if (method === 'GET' && path.includes('/orders')) {
      return handleGetOrders(event);
    }

    // Route: POST /ondc/sync
    if (method === 'POST' && path.includes('/sync')) {
      return handleSync(event);
    }

    // Route: GET /ondc/stats
    if (method === 'GET' && path.includes('/stats')) {
      return handleGetStats(event);
    }

    return respond(404, { error: 'ONDC route not found', path, method });
  } catch (error) {
    console.error('ONDC handler error:', error);
    return respond(500, { error: 'Internal server error', detail: String(error) });
  }
}

async function handleGetCatalog(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
  const storeId = event.queryStringParameters?.storeId;
  if (!storeId) return respond(400, { error: 'Query parameter "storeId" is required' });

  const catalog = await getOndcCatalog(storeId);

  return respond(200, {
    storeId,
    catalog,
    totalItems: catalog.length,
    inStock: catalog.filter((c) => c.ondcStatus === 'ACTIVE').length,
    outOfStock: catalog.filter((c) => c.ondcStatus === 'OUT_OF_STOCK').length,
    ondcDomain: 'ONDC:RET10',  // Grocery retail domain
  });
}

async function handleGetOrders(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
  const storeId = event.queryStringParameters?.storeId;
  if (!storeId) return respond(400, { error: 'Query parameter "storeId" is required' });

  const orders = await getOndcOrders(storeId);

  // Sort by createdAt descending
  orders.sort((a, b) => b.createdAt.localeCompare(a.createdAt));

  return respond(200, {
    storeId,
    orders,
    totalOrders: orders.length,
    pendingOrders: orders.filter((o) => o.status === 'PENDING').length,
    ondcDomain: 'ONDC:RET10',
  });
}

async function handleSync(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
  const body = JSON.parse(event.body || '{}');
  const storeId = body.storeId || 'store-001';

  const result = await syncCatalogToOndc(storeId);

  return respond(200, {
    message: 'ONDC catalog sync completed',
    storeId,
    synced: result.synced,
    active: result.active,
    outOfStock: result.outOfStock,
    syncedAt: new Date().toISOString(),
    ondcDomain: 'ONDC:RET10',
  });
}

async function handleGetStats(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
  const storeId = event.queryStringParameters?.storeId;
  if (!storeId) return respond(400, { error: 'Query parameter "storeId" is required' });

  const stats = await getOndcStats(storeId);

  return respond(200, {
    storeId,
    stats,
    ondcDomain: 'ONDC:RET10',
    networkStatus: 'ACTIVE',  // Mock network status
    sellerAppId: 'swar-vani-001',
  });
}
