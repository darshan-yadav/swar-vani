/**
 * Khata handler — Monthly credit account management for kirana stores.
 *
 * GET /khata?storeId=... → list all customers with outstanding balances
 * GET /khata/{name}/transactions?storeId=... → list transactions for a customer
 * POST /khata → add purchase or payment (from web UI)
 */

import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { queryByPK, getItem, putItem } from '../lib/dynamo';

const CORS_HEADERS = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type,Authorization,X-Store-Id',
};

function respond(statusCode: number, body: unknown) {
  return { statusCode, headers: CORS_HEADERS, body: JSON.stringify(body) };
}

export async function handler(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
  console.log('Khata handler:', event.httpMethod, event.path);

  if (event.httpMethod === 'OPTIONS') return respond(200, {});

  const storeId = event.queryStringParameters?.storeId
    || event.headers?.['X-Store-Id']
    || event.headers?.['x-store-id']
    || 'store-001';

  try {
    // GET /khata — list all customers
    if (event.httpMethod === 'GET' && !event.pathParameters?.name) {
      const allItems = await queryByPK('STORE#' + storeId, 'KHATA#');
      const summaries = allItems
        .filter(item => (item.SK as string).endsWith('#SUMMARY'))
        .map(item => ({
          customerName: item.customerName as string,
          normalizedName: item.normalizedName as string,
          outstanding: Number(item.outstanding || 0),
          totalPurchases: Number(item.totalPurchases || 0),
          totalPayments: Number(item.totalPayments || 0),
          purchaseCount: Number(item.purchaseCount || 0),
          paymentCount: Number(item.paymentCount || 0),
          lastTransaction: (item.lastTransaction as string) || '',
        }))
        .filter(s => s.outstanding > 0 || s.totalPurchases > 0)
        .sort((a, b) => b.outstanding - a.outstanding);

      const totalOutstanding = summaries.reduce((sum, s) => sum + s.outstanding, 0);

      return respond(200, {
        customers: summaries,
        totalOutstanding,
        count: summaries.length,
      });
    }

    // GET /khata/{name}/transactions — list transactions for a customer
    if (event.httpMethod === 'GET' && event.pathParameters?.name) {
      const normalizedName = event.pathParameters.name;
      const allItems = await queryByPK('STORE#' + storeId, 'KHATA#' + normalizedName + '#TXN#');
      const transactions = allItems.map(item => ({
        transactionType: item.transactionType as string,
        amount: Number(item.amount || 0),
        items: (item.items as string) || null,
        dateTime: (item.dateTime as string) || '',
        customerName: item.customerName as string,
      }));

      // Also get the summary
      const summary = await getItem<Record<string, unknown>>(
        'STORE#' + storeId,
        'KHATA#' + normalizedName + '#SUMMARY'
      );

      return respond(200, {
        customerName: (summary?.customerName as string) || normalizedName,
        outstanding: Number(summary?.outstanding || 0),
        totalPurchases: Number(summary?.totalPurchases || 0),
        totalPayments: Number(summary?.totalPayments || 0),
        transactions,
      });
    }

    // POST /khata — add purchase or payment from web UI
    if (event.httpMethod === 'POST') {
      const body = JSON.parse(event.body || '{}');
      const { action, customerName, amount, items } = body as {
        action: 'purchase' | 'payment';
        customerName: string;
        amount: number;
        items?: string;
      };

      if (!customerName || !amount || !action) {
        return respond(400, { error: 'customerName, amount, and action (purchase|payment) required' });
      }

      const normalizedName = customerName.toLowerCase().replace(/\s+/g, '_');
      const txnTimestamp = Date.now();
      const txnType = action === 'purchase' ? 'PURCHASE' : 'PAYMENT';

      // Store the transaction
      await putItem({
        PK: 'STORE#' + storeId,
        SK: 'KHATA#' + normalizedName + '#TXN#' + txnTimestamp,
        entityType: 'KHATA_TXN',
        storeId,
        customerName,
        normalizedName,
        transactionType: txnType,
        amount,
        items: items || null,
        dateTime: new Date().toISOString(),
      });

      // Update summary
      const summaryKey = 'KHATA#' + normalizedName + '#SUMMARY';
      const existing = await getItem<Record<string, unknown>>('STORE#' + storeId, summaryKey);

      const prevOutstanding = Number(existing?.outstanding || 0);
      const newOutstanding = txnType === 'PURCHASE'
        ? prevOutstanding + amount
        : Math.max(0, prevOutstanding - amount);

      await putItem({
        PK: 'STORE#' + storeId,
        SK: summaryKey,
        entityType: 'KHATA_SUMMARY',
        storeId,
        customerName,
        normalizedName,
        outstanding: newOutstanding,
        totalPurchases: Number(existing?.totalPurchases || 0) + (txnType === 'PURCHASE' ? amount : 0),
        totalPayments: Number(existing?.totalPayments || 0) + (txnType === 'PAYMENT' ? amount : 0),
        purchaseCount: Number(existing?.purchaseCount || 0) + (txnType === 'PURCHASE' ? 1 : 0),
        paymentCount: Number(existing?.paymentCount || 0) + (txnType === 'PAYMENT' ? 1 : 0),
        lastTransaction: new Date().toISOString(),
        createdAt: (existing?.createdAt as string) || new Date().toISOString(),
      });

      return respond(200, {
        success: true,
        customerName,
        transactionType: txnType,
        amount,
        outstanding: newOutstanding,
        alert: newOutstanding > 10000 ? `Warning: ${customerName} has crossed ₹10,000 outstanding (₹${newOutstanding})` : null,
      });
    }

    return respond(400, { error: 'Unsupported method' });
  } catch (err) {
    console.error('Khata handler error:', err);
    return respond(500, { error: 'Internal server error' });
  }
}
