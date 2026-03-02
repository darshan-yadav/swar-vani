/**
 * Mock ONDC (Open Network for Digital Commerce) Integration
 * Simulates ONDC catalog sync, order management, and stats
 * for hackathon demonstration purposes.
 */
import { putItem, queryByPK, getItem, batchWrite } from './dynamo';
import { PRODUCT_MASTER } from './product-master';
import { ulid } from 'ulid';

// ─── Types ───

export interface OndcCatalogItem {
  ondcItemId: string;          // "ONDC-{productId}"
  name: string;                // English name
  nameHi: string;              // Hindi name
  ondcCategory: string;        // ONDC retail domain category
  price: number;               // MRP
  sellingPrice: number;        // Store's selling price
  inStock: boolean;
  quantity: number;
  lastSyncedAt: string;        // ISO timestamp
  ondcStatus: 'ACTIVE' | 'INACTIVE' | 'OUT_OF_STOCK';
}

export interface OndcOrder {
  orderId: string;
  buyerName: string;
  buyerAddress: string;
  items: { productId: string; name: string; qty: number; price: number }[];
  totalAmount: number;
  status: 'PENDING' | 'CONFIRMED' | 'DISPATCHED' | 'DELIVERED';
  createdAt: string;
  ondcTransactionId: string;
}

export interface OndcStats {
  totalListed: number;
  inStock: number;
  outOfStock: number;
  ordersToday: number;
  revenueToday: number;
  lastSyncedAt: string | null;
}

// ─── Category Mapping ───

const CATEGORY_MAP: Record<string, string> = {
  'Dairy': 'Grocery > Dairy & Cheese',
  'Biscuits': 'Grocery > Snacks & Branded Foods',
  'Snacks': 'Grocery > Snacks & Branded Foods',
  'Chocolate': 'Grocery > Snacks & Branded Foods',
  'Noodles': 'Grocery > Snacks & Branded Foods',
  'Beverages': 'Grocery > Beverages',
  'Health Drinks': 'Grocery > Beverages',
  'Cleaning': 'Grocery > Cleaning & Household',
  'Detergent': 'Grocery > Cleaning & Household',
  'Home Care': 'Grocery > Cleaning & Household',
  'Personal Care': 'Grocery > Bath & Body',
  'Spices & Salt': 'Grocery > Masala & Seasoning',
  'Sauces': 'Grocery > Masala & Seasoning',
  'Rice': 'Grocery > Foodgrains',
  'Flour': 'Grocery > Foodgrains',
  'Pulses': 'Grocery > Foodgrains',
  'Essentials': 'Grocery > Foodgrains',
  'Cooking Oil': 'Grocery > Oil & Ghee',
  'Tea & Coffee': 'Grocery > Tea & Coffee',
  'Bakery': 'Grocery > Snacks & Branded Foods',
  'Frozen': 'Grocery > Dairy & Cheese',
  'Stationery': 'Grocery > Cleaning & Household',
};

function mapToOndcCategory(productCategory: string): string {
  return CATEGORY_MAP[productCategory] || 'Grocery > Snacks & Branded Foods';
}

// ─── MRP lookup (simulated — slightly above base price) ───

const MRP_MAP: Record<string, number> = {
  P001: 10, P002: 14, P003: 25, P004: 28, P005: 99,
  P006: 10, P007: 30, P008: 280, P009: 130, P010: 80,
  P011: 80, P012: 20, P013: 60, P014: 290, P015: 185,
  P016: 52, P017: 42, P018: 105, P019: 450, P020: 165,
  P021: 48, P022: 72, P023: 270, P024: 50, P025: 20,
  P026: 90, P027: 89, P028: 85, P029: 109, P030: 22,
  P031: 115, P032: 90, P033: 35, P034: 20, P035: 530,
  P036: 189, P037: 200, P038: 250, P039: 45, P040: 18,
  P041: 52, P042: 38, P043: 52, P044: 45, P045: 10,
  P046: 85, P047: 26, P048: 128, P049: 180, P050: 65,
};

// ─── Core Functions ───

/**
 * Sync inventory items to ONDC catalog format.
 * Reads current inventory and product metadata, writes ONDC catalog items to DynamoDB.
 */
export async function syncCatalogToOndc(storeId: string): Promise<{ synced: number; active: number; outOfStock: number }> {
  // Get all inventory items for the store
  const inventoryItems = await queryByPK(`STORE#${storeId}`, 'INV#');

  if (inventoryItems.length === 0) {
    return { synced: 0, active: 0, outOfStock: 0 };
  }

  let active = 0;
  let outOfStock = 0;
  const now = new Date().toISOString();
  const catalogItems: Record<string, unknown>[] = [];

  for (const inv of inventoryItems) {
    const productId = inv.product_id as string;
    const stock = Number(inv.stock) || 0;

    // Get product metadata
    const meta = await getItem<Record<string, unknown>>(`PRODUCT#${productId}`, 'META');
    if (!meta) continue;

    const category = meta.category as string;
    const ondcStatus: 'ACTIVE' | 'OUT_OF_STOCK' = stock > 0 ? 'ACTIVE' : 'OUT_OF_STOCK';
    if (stock > 0) active++;
    else outOfStock++;

    const mrp = MRP_MAP[productId] || 100;
    const sellingPrice = Math.round(mrp * 0.95); // 5% below MRP

    catalogItems.push({
      PK: `STORE#${storeId}`,
      SK: `ONDC#CATALOG#${productId}`,
      entityType: 'ONDC_CATALOG',
      storeId,
      ondcItemId: `ONDC-${productId}`,
      name: meta.name_en as string,
      nameHi: meta.name_hi as string,
      ondcCategory: mapToOndcCategory(category),
      price: mrp,
      sellingPrice,
      inStock: stock > 0,
      quantity: stock,
      lastSyncedAt: now,
      ondcStatus,
      productId,
      category,
      unit: meta.unit as string,
    });
  }

  // Batch write all catalog items
  if (catalogItems.length > 0) {
    await batchWrite(catalogItems);
  }

  return { synced: catalogItems.length, active, outOfStock };
}

/**
 * Get the ONDC catalog for a store.
 */
export async function getOndcCatalog(storeId: string): Promise<OndcCatalogItem[]> {
  const items = await queryByPK(`STORE#${storeId}`, 'ONDC#CATALOG#');

  return items.map((item) => ({
    ondcItemId: item.ondcItemId as string,
    name: item.name as string,
    nameHi: item.nameHi as string,
    ondcCategory: item.ondcCategory as string,
    price: Number(item.price) || 0,
    sellingPrice: Number(item.sellingPrice) || 0,
    inStock: item.inStock as boolean,
    quantity: Number(item.quantity) || 0,
    lastSyncedAt: item.lastSyncedAt as string,
    ondcStatus: item.ondcStatus as 'ACTIVE' | 'INACTIVE' | 'OUT_OF_STOCK',
  }));
}

/**
 * Get ONDC orders for a store.
 */
export async function getOndcOrders(storeId: string): Promise<OndcOrder[]> {
  const items = await queryByPK(`STORE#${storeId}`, 'ONDC#ORDER#');

  return items.map((item) => ({
    orderId: item.orderId as string,
    buyerName: item.buyerName as string,
    buyerAddress: item.buyerAddress as string,
    items: item.items as { productId: string; name: string; qty: number; price: number }[],
    totalAmount: Number(item.totalAmount) || 0,
    status: item.status as 'PENDING' | 'CONFIRMED' | 'DISPATCHED' | 'DELIVERED',
    createdAt: item.createdAt as string,
    ondcTransactionId: item.ondcTransactionId as string,
  }));
}

/**
 * Get ONDC dashboard stats for a store.
 */
export async function getOndcStats(storeId: string): Promise<OndcStats> {
  const catalog = await getOndcCatalog(storeId);
  const orders = await getOndcOrders(storeId);

  const today = new Date().toISOString().split('T')[0];
  const todayOrders = orders.filter((o) => o.createdAt.startsWith(today));
  const revenueToday = todayOrders.reduce((sum, o) => sum + o.totalAmount, 0);

  const inStock = catalog.filter((c) => c.ondcStatus === 'ACTIVE').length;
  const outOfStock = catalog.filter((c) => c.ondcStatus === 'OUT_OF_STOCK').length;

  // Find last synced time
  let lastSyncedAt: string | null = null;
  for (const item of catalog) {
    if (!lastSyncedAt || item.lastSyncedAt > lastSyncedAt) {
      lastSyncedAt = item.lastSyncedAt;
    }
  }

  return {
    totalListed: catalog.length,
    inStock,
    outOfStock,
    ordersToday: todayOrders.length,
    revenueToday,
    lastSyncedAt,
  };
}

/**
 * Generate mock ONDC incoming orders (for demo/simulation).
 * Creates realistic orders from nearby buyers.
 */
export async function generateMockOndcOrders(storeId: string, count: number = 3): Promise<OndcOrder[]> {
  const buyers = [
    { name: 'Priya Sharma', address: 'B-204, Sai Krupa CHS, Dadar West, Mumbai 400028' },
    { name: 'Amit Patel', address: '12, Shivaji Nagar, Andheri East, Mumbai 400069' },
    { name: 'Sneha Kulkarni', address: 'Flat 301, Ganesh Towers, Parel, Mumbai 400012' },
    { name: 'Rajesh Gupta', address: '45-A, MG Road, Borivali West, Mumbai 400092' },
    { name: 'Meera Iyer', address: '7/C, Sea View Apartments, Worli, Mumbai 400018' },
    { name: 'Vikram Singh', address: '15, Lotus Colony, Bandra East, Mumbai 400051' },
    { name: 'Anita Deshmukh', address: 'A-102, Tulsi Heights, Mulund West, Mumbai 400080' },
  ];

  // Get catalog to pick from real items
  const catalog = await getOndcCatalog(storeId);
  const inStockItems = catalog.filter((c) => c.inStock);

  if (inStockItems.length === 0) return [];

  const orders: OndcOrder[] = [];
  const now = new Date();

  for (let i = 0; i < Math.min(count, buyers.length); i++) {
    const buyer = buyers[i];
    const numItems = Math.floor(Math.random() * 3) + 1; // 1-3 items per order
    const orderItems: { productId: string; name: string; qty: number; price: number }[] = [];

    for (let j = 0; j < numItems; j++) {
      const catalogItem = inStockItems[Math.floor(Math.random() * inStockItems.length)];
      const qty = Math.floor(Math.random() * 3) + 1;
      orderItems.push({
        productId: catalogItem.ondcItemId.replace('ONDC-', ''),
        name: catalogItem.name,
        qty,
        price: catalogItem.sellingPrice,
      });
    }

    const totalAmount = orderItems.reduce((sum, item) => sum + item.price * item.qty, 0);
    const statuses: Array<'PENDING' | 'CONFIRMED' | 'DISPATCHED' | 'DELIVERED'> = ['PENDING', 'CONFIRMED', 'DISPATCHED', 'DELIVERED'];
    const status = statuses[Math.floor(Math.random() * statuses.length)];

    // Create order with time offset (orders throughout the day)
    const orderTime = new Date(now.getTime() - Math.floor(Math.random() * 8 * 60 * 60 * 1000));
    const orderId = `ONDC-ORD-${ulid()}`;

    const order: OndcOrder = {
      orderId,
      buyerName: buyer.name,
      buyerAddress: buyer.address,
      items: orderItems,
      totalAmount,
      status,
      createdAt: orderTime.toISOString(),
      ondcTransactionId: `TXN-${ulid()}`,
    };

    // Persist to DynamoDB
    await putItem({
      PK: `STORE#${storeId}`,
      SK: `ONDC#ORDER#${orderId}`,
      entityType: 'ONDC_ORDER',
      storeId,
      ...order,
    });

    orders.push(order);
  }

  return orders;
}
