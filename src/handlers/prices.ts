import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { queryByPK } from '../lib/dynamo';
import { ProductPrice, ApiResponse } from '../lib/types';

const CORS_HEADERS = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET,OPTIONS',
};

function respond(statusCode: number, body: unknown): ApiResponse {
  return { statusCode, headers: CORS_HEADERS, body: JSON.stringify(body) };
}

/**
 * GET /prices/{productId}  — returns all supplier prices for a product, sorted by cost
 */
export async function handler(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
  try {
    if (event.httpMethod === 'OPTIONS') {
      return respond(200, {});
    }

    const productId = event.pathParameters?.productId;

    if (!productId) {
      return respond(400, { error: 'Path parameter "productId" is required' });
    }

    // Query all PRICE# items for this product
    const items = await queryByPK(`PRODUCT#${productId}`, 'PRICE#');

    if (items.length === 0) {
      return respond(404, { error: `No pricing data found for product ${productId}` });
    }

    // Map and sort by price (ascending = cheapest first)
    // DynamoDB uses snake_case field names
    const prices = items
      .map((item: Record<string, unknown>) => ({
        supplierId: item.supplier_id as string,
        supplierName: item.supplier_name as string,
        price: Number(item.price) || 0,
        moq: Number(item.moq) || 0,
        deliveryDays: Number(item.delivery_days) || 0,
        reliabilityPct: Number(item.reliability_pct) || 0,
        updatedAt: item.updated_at as string,
      }))
      .sort((a, b) => a.price - b.price);

    // Calculate savings potential
    const cheapest = prices[0];
    const mostExpensive = prices[prices.length - 1];
    const savingsPercent = mostExpensive.price > 0
      ? Math.round(((mostExpensive.price - cheapest.price) / mostExpensive.price) * 100)
      : 0;

    return respond(200, {
      productId,
      prices,
      recommendation: {
        bestPrice: cheapest,
        savingsPercent,
        message: savingsPercent > 0
          ? `Save ${savingsPercent}% by ordering from ${cheapest.supplierName} (₹${cheapest.price} vs ₹${mostExpensive.price})`
          : 'All suppliers offer the same price',
      },
    });
  } catch (error) {
    console.error('Prices error:', error);
    return respond(500, { error: 'Internal server error' });
  }
}
