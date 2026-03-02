/**
 * Seed demo data — creates a "lived-in" feel for the demo.
 * 
 * - Sets some products to 0 stock (depleted)
 * - Sets some to low stock
 * - Creates 3 draft orders from earlier today
 * - Creates 8-10 voice log entries simulating a realistic day
 */

import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import {
  DynamoDBDocumentClient,
  PutCommand,
  UpdateCommand,
} from '@aws-sdk/lib-dynamodb';

const TABLE_NAME = 'swar-vani-data';
const REGION = 'us-east-1';
const STORE_ID = 'store-001';

const rawClient = new DynamoDBClient({ region: REGION });
const client = DynamoDBDocumentClient.from(rawClient, {
  marshallOptions: { removeUndefinedValues: true },
});

const today = new Date().toISOString().split('T')[0];

async function put(item: Record<string, unknown>) {
  const now = new Date().toISOString();
  await client.send(new PutCommand({
    TableName: TABLE_NAME,
    Item: { ...item, createdAt: item.createdAt || now, updatedAt: now },
  }));
}

async function update(pk: string, sk: string, updates: Record<string, unknown>) {
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

  await client.send(new UpdateCommand({
    TableName: TABLE_NAME,
    Key: { PK: pk, SK: sk },
    UpdateExpression: `SET ${expressionParts.join(', ')}`,
    ExpressionAttributeNames: attrNames,
    ExpressionAttributeValues: attrValues,
  }));
}

async function seedDemoData() {
  console.log('🎭 Seeding demo data for a lived-in feel...\n');

  // ── 1. Set depleted products ──
  console.log('🔴 Setting depleted products...');
  await update('STORE#' + STORE_ID, 'INV#P039', { stock: 0, low_stock: true });  // Bread
  await update('STORE#' + STORE_ID, 'INV#P024', { stock: 0, low_stock: true });  // Cadbury
  console.log('   P039 (Bread) → 0 stock');
  console.log('   P024 (Cadbury) → 0 stock');

  // ── 2. Set low-stock products ──
  console.log('\n🟡 Setting low-stock products...');
  await update('STORE#' + STORE_ID, 'INV#P003', { stock: 1, low_stock: true });   // Milk → 1 crate
  await update('STORE#' + STORE_ID, 'INV#P001', { stock: 2, low_stock: true });   // Parle-G → 2 cartons
  await update('STORE#' + STORE_ID, 'INV#P005', { stock: 1, low_stock: true });   // Surf Excel → 1
  await update('STORE#' + STORE_ID, 'INV#P010', { stock: 3, low_stock: true });   // Coca-Cola → 3 cases
  await update('STORE#' + STORE_ID, 'INV#P019', { stock: 1, low_stock: true });   // Rice → 1 bag
  console.log('   P003 (Milk) → 1, P001 (Parle-G) → 2, P005 (Surf) → 1');
  console.log('   P010 (Coca-Cola) → 3, P019 (Rice) → 1');

  // ── 3. Create 3 draft orders from earlier today ──
  console.log('\n📦 Creating 3 draft orders...');

  await put({
    PK: 'STORE#' + STORE_ID,
    SK: 'ORDER#demo-ord-101',
    GSI1PK: 'ORDER#demo-ord-101',
    GSI1SK: 'STORE#' + STORE_ID,
    entityType: 'ORDER',
    storeId: STORE_ID,
    orderId: 'demo-ord-101',
    items: [
      { productId: 'P039', productName: 'Britannia Bread 400g', quantity: 12, supplierId: 'localmart', unitPrice: 420, lineTotal: 5040 },
    ],
    totalAmount: 5040,
    status: 'DRAFT',
    supplier: 'LocalMart Wholesale',
    created_via: 'voice',
    createdAt: today + 'T09:20:00Z',
  });
  console.log('   Order demo-ord-101: Bread x12 (₹5040) — DRAFT');

  await put({
    PK: 'STORE#' + STORE_ID,
    SK: 'ORDER#demo-ord-102',
    GSI1PK: 'ORDER#demo-ord-102',
    GSI1SK: 'STORE#' + STORE_ID,
    entityType: 'ORDER',
    storeId: STORE_ID,
    orderId: 'demo-ord-102',
    items: [
      { productId: 'P001', productName: 'Parle-G Glucose Biscuit', quantity: 10, supplierId: 'jumbotail', unitPrice: 461, lineTotal: 4610 },
      { productId: 'P003', productName: 'Amul Taaza Milk 500ml', quantity: 5, supplierId: 'jumbotail', unitPrice: 228, lineTotal: 1140 },
    ],
    totalAmount: 5750,
    status: 'CONFIRMED',
    supplier: 'Jumbotail',
    created_via: 'voice',
    createdAt: today + 'T11:10:00Z',
    confirmedAt: today + 'T11:12:00Z',
  });
  console.log('   Order demo-ord-102: Parle-G x10 + Milk x5 (₹5750) — CONFIRMED');

  await put({
    PK: 'STORE#' + STORE_ID,
    SK: 'ORDER#demo-ord-103',
    GSI1PK: 'ORDER#demo-ord-103',
    GSI1SK: 'STORE#' + STORE_ID,
    entityType: 'ORDER',
    storeId: STORE_ID,
    orderId: 'demo-ord-103',
    items: [
      { productId: 'P010', productName: 'Coca-Cola 2L', quantity: 6, supplierId: 'udaan', unitPrice: 95, lineTotal: 570 },
      { productId: 'P011', productName: 'Thums Up 2L', quantity: 6, supplierId: 'udaan', unitPrice: 95, lineTotal: 570 },
    ],
    totalAmount: 1140,
    status: 'DRAFT',
    supplier: 'Udaan',
    created_via: 'voice',
    createdAt: today + 'T13:10:00Z',
  });
  console.log('   Order demo-ord-103: Coca-Cola x6 + Thums Up x6 (₹1140) — DRAFT');

  // ── 4. Create voice log entries for today ──
  console.log('\n🎙️  Creating voice log entries...');

  const voiceLogs = [
    {
      time: '09:00:00',
      ts: Date.now() - 8 * 3600000,
      command: 'check: stock overview',
      intent: 'summary',
      productId: null,
    },
    {
      time: '09:15:00',
      ts: Date.now() - 7.75 * 3600000,
      command: 'depleted: bread',
      intent: 'restock_command',
      productId: 'P039',
    },
    {
      time: '10:30:00',
      ts: Date.now() - 6.5 * 3600000,
      command: 'low: milk',
      intent: 'restock_command',
      productId: 'P003',
    },
    {
      time: '11:00:00',
      ts: Date.now() - 6 * 3600000,
      command: 'check: parle-g prices',
      intent: 'compare_prices',
      productId: 'P001',
    },
    {
      time: '11:05:00',
      ts: Date.now() - 5.92 * 3600000,
      command: 'order: parle-g x10',
      intent: 'create_order',
      productId: 'P001',
    },
    {
      time: '13:00:00',
      ts: Date.now() - 4 * 3600000,
      command: 'low: cold drinks',
      intent: 'restock_command',
      productId: 'P010',
    },
    {
      time: '13:05:00',
      ts: Date.now() - 3.92 * 3600000,
      command: 'depleted: cold drinks',
      intent: 'restock_command',
      productId: 'P010',
    },
    {
      time: '15:00:00',
      ts: Date.now() - 2 * 3600000,
      command: 'check: summary aaj ka',
      intent: 'summary',
      productId: null,
    },
    {
      time: '15:30:00',
      ts: Date.now() - 1.5 * 3600000,
      command: 'check: atta stock',
      intent: 'availability_check',
      productId: 'P008',
    },
    {
      time: '16:00:00',
      ts: Date.now() - 1 * 3600000,
      command: 'low: surf excel',
      intent: 'restock_command',
      productId: 'P005',
    },
  ];

  for (const log of voiceLogs) {
    const logKey = 'DAYLOG#' + today + '#' + log.ts;
    await put({
      PK: 'STORE#' + STORE_ID,
      SK: logKey,
      entityType: 'VOICE_LOG',
      storeId: STORE_ID,
      date: today,
      timestamp: today + 'T' + log.time + 'Z',
      command: log.command,
      intent: log.intent,
      productId: log.productId,
    });
    console.log('   ' + log.time + ' IST — ' + log.command);
  }

  console.log('\n✅ Demo data seeded!');
  console.log('   2 depleted, 5 low-stock, 3 orders, 10 voice logs');
  console.log('   Cola marked depleted twice today (velocity alert will trigger!)');
}

seedDemoData().catch(console.error);
