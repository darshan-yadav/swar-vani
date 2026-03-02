/**
 * Enhanced conversation engine — "Ramu Kaka" persona.
 * Supports: availability check, restock command, summary, price compare,
 * order creation, low stock, depletion tracking, weather/festival intelligence.
 */
import { putItem, getItem, updateItem, queryByPK, queryGSI1 } from './dynamo';
import {
  Conversation,
  ConversationMessage,
  ConversationAction,
} from './types';
import {
  BedrockRuntimeClient,
  InvokeModelCommand,
} from '@aws-sdk/client-bedrock-runtime';
import { PRODUCT_MASTER, resolveProductAlias, getProductsForWeather, getProductsForFestival, DISTRIBUTOR_LABELS, type DistributorType } from './product-master';
import { getUpcomingFestivals } from './festival-calendar';
import { getWeatherForecast } from './weather';
import { syncCatalogToOndc, getOndcStats as fetchOndcStats } from './ondc-mock';

const bedrockClient = new BedrockRuntimeClient({ region: process.env.AWS_REGION || 'us-east-1' });

// ─── System Prompts ───

const INTENT_SYSTEM_PROMPT = `You are Ramu Kaka, an AI procurement assistant for Indian kirana stores.
You understand Hindi, Hinglish, English, Tamil, Telugu, and Kannada naturally — including code-switching.

Parse the user message and return ONLY a JSON object with the detected intent.
- Parse intent regardless of input language
- product_query should always be in English (normalized)

Available intents:
{"intent": "availability_check", "product_query": "product name (English or Hindi romanized)"}
  — when user asks "do we have X?", "X hai?", "X kitna hai?", "check X stock"

{"intent": "restock_command", "product_query": "product name", "status": "depleted|low"}
  — when user says "X khatam ho gaya", "X finished", "note down X is finished", "X bas 5 bache hain"
  — "depleted" = fully out of stock, "low" = running low but some left

{"intent": "update_stock", "product_query": "product name", "quantity": N}
  — when user says "X ki N unit bachi hai", "only N X left", "X ka stock N hai"

{"intent": "compare_prices", "product_query": "product name"}
  — when user asks about price/rate/sasta/mehnga

{"intent": "create_order", "product_query": "product name", "quantity": N, "supplier": "optional supplier name"}
  — when user says order/mangwao/bhejo

{"intent": "list_low_stock"}
  — when user asks what is low/kam/khatam/finished

{"intent": "summary", "type": "daily|distributor|full"}
  — when user says "summary batao", "list batao", "kal distributor aane wala hai", "restock list"
  — "daily" = today's changes, "distributor" = grouped by distributor, "full" = everything

{"intent": "ondc_status"}
  — when user asks about ONDC, online orders, online dukaan, "mere online store ka status", "ONDC pe kya chal raha", "online kya bikra"

{"intent": "ondc_sync", "action": "sync_all|sync_product", "product_query": "optional product name"}
  — when user says "ONDC pe catalog update karo", "online store pe stock update karo", "sync karo", "ONDC pe daal do"

{"intent": "khata_purchase", "customer_name": "name", "amount": N, "items": "optional items description"}
  — when user says "Add purchase for X", "X ke khate mein Y rupees daal do", "X ka Y rupees ka saman", "X ne Y rupees ka liya"
  — Extract: customer name (required), total amount (required), items (optional)

{"intent": "khata_payment", "customer_name": "name", "amount": N}
  — when user says "X ne Y rupees diye", "X paid Y rupees", "X se Y mila", "X ka payment aaya"

{"intent": "khata_balance", "customer_name": "name"}
  — when user says "How much does X owe?", "X ka kitna baki hai?", "X ka outstanding", "X ka hisab"

{"intent": "khata_list"}
  — when user asks about all outstanding accounts, "sabka hisab batao", "list all khata", "total kitna baki hai"

{"intent": "general_query", "text": "the original question"}
  — anything else

Rules:
- product_query can be Hindi romanized ("doodh", "atta", "bread") or English ("milk", "flour")
- Distinguish between CHECKING stock ("doodh hai?") vs REPORTING depletion ("doodh khatam ho gaya")
- If user mentions weather context ("garmi hai", "barish ho rahi"), still parse the actual intent
- "Note kar lo" / "note it down" / "likh lo" signals a restock_command
- Return ONLY the JSON. No explanation, no markdown.`;

const RESPONSE_SYSTEM_PROMPT = `You are Ramu Kaka (रामू काका), a warm, experienced, and efficient procurement assistant for Indian kirana stores.

Personality:
- You speak like a trusted, senior helper — confident, caring, slightly paternal
- You use natural Hindi (Devanagari) with occasional Hinglish
- You're concise but thorough — like a real kaka who knows the shop inside out
- You acknowledge commands with brief confirmation ("नोट कर लिया", "समझ गया")
- You proactively suggest things (weather, festivals, patterns)
- You address the shopkeeper informally (तुम/तू style, not आप — like family)

Language rules:
- If the user spoke in English, respond in English with Hindi terms for products
- If the user spoke in Tamil, respond in Tamil (தமிழ்) with natural product names
- If the user spoke in Telugu, respond in Telugu (తెలుగు) with natural product names
- If the user spoke in Kannada, respond in Kannada (ಕನ್ನಡ) with natural product names
- Default to Hindi (Devanagari) for Hindi/Hinglish input
- Always include numbers and prices in digits (₹, quantities)

Response rules:
- Keep responses under 3-4 sentences max
- Include specific numbers (stock counts, prices, quantities)
- Use ₹ for prices
- When reporting low stock, suggest reorder quantities
- When giving summaries, be structured (use bullet style naturally in speech)
- If an item was marked depleted twice in 24 hours, mention it needs higher daily quota`;

// ─── Bedrock helpers ───

export async function callBedrock(modelId: string, systemPrompt: string, userText: string): Promise<string> {
  const requestBody = {
    inferenceConfig: { maxTokens: 800 },
    system: [{ text: systemPrompt }],
    messages: [
      { role: 'user', content: [{ text: userText }] },
    ],
  };

  const command = new InvokeModelCommand({
    modelId,
    contentType: 'application/json',
    accept: 'application/json',
    body: JSON.stringify(requestBody),
  });

  const response = await bedrockClient.send(command);
  const responseBody = JSON.parse(new TextDecoder().decode(response.body));
  return responseBody.output.message.content[0].text;
}

// ─── Data access helpers ───

interface ProductInfo {
  productId: string;
  nameEn: string;
  nameHi: string;
  category: string;
  unit: string;
}

export async function searchProducts(query: string): Promise<ProductInfo[]> {
  // First try alias resolution from product master
  const resolvedId = resolveProductAlias(query);
  if (resolvedId) {
    const item = await getItem<Record<string, unknown>>('PRODUCT#' + resolvedId, 'META');
    if (item) {
      return [{
        productId: item.product_id as string,
        nameEn: item.name_en as string,
        nameHi: item.name_hi as string,
        category: item.category as string,
        unit: item.unit as string,
      }];
    }
  }

  // Fallback: search all products
  const allProducts = await queryGSI1('META', 'PRODUCT#');
  const queryLower = query.toLowerCase();

  return allProducts
    .filter((item) => {
      const nameEn = ((item.name_en as string) || '').toLowerCase();
      const nameHi = (item.name_hi as string) || '';
      const category = ((item.category as string) || '').toLowerCase();
      return nameEn.includes(queryLower) || nameHi.includes(query) || category.includes(queryLower);
    })
    .map((item) => ({
      productId: item.product_id as string,
      nameEn: item.name_en as string,
      nameHi: item.name_hi as string,
      category: item.category as string,
      unit: item.unit as string,
    }));
}

interface InventoryInfo {
  productId: string;
  stock: number;
  reorderPoint: number;
  avgDailySales: number;
  lowStock: boolean;
  daysOfStock: number | null;
}

async function getInventory(storeId: string, productId: string): Promise<InventoryInfo | null> {
  const item = await getItem<Record<string, unknown>>('STORE#' + storeId, 'INV#' + productId);
  if (!item) return null;

  const stock = Number(item.stock) || 0;
  const reorderPoint = Number(item.reorder_point) || 0;
  const avgDailySales = Number(item.avg_daily_sales) || 0;

  return {
    productId: item.product_id as string,
    stock,
    reorderPoint,
    avgDailySales,
    lowStock: stock <= reorderPoint,
    daysOfStock: avgDailySales > 0 ? Math.floor(stock / avgDailySales) : null,
  };
}

async function getAllInventory(storeId: string): Promise<(InventoryInfo & { productId: string })[]> {
  const items = await queryByPK('STORE#' + storeId, 'INV#');
  return items.map((item) => {
    const stock = Number(item.stock) || 0;
    const reorderPoint = Number(item.reorder_point) || 0;
    const avgDailySales = Number(item.avg_daily_sales) || 0;
    return {
      productId: item.product_id as string,
      stock,
      reorderPoint,
      avgDailySales,
      lowStock: stock <= reorderPoint,
      daysOfStock: avgDailySales > 0 ? Math.floor(stock / avgDailySales) : null,
    };
  });
}

interface PriceInfo {
  supplierId: string;
  supplierName: string;
  price: number;
  moq: number;
  deliveryDays: number;
  reliabilityPct: number;
}

async function getPrices(productId: string): Promise<PriceInfo[]> {
  const items = await queryByPK('PRODUCT#' + productId, 'PRICE#');
  return items
    .map((item) => ({
      supplierId: item.supplier_id as string,
      supplierName: item.supplier_name as string,
      price: Number(item.price) || 0,
      moq: Number(item.moq) || 0,
      deliveryDays: Number(item.delivery_days) || 0,
      reliabilityPct: Number(item.reliability_pct) || 0,
    }))
    .sort((a, b) => a.price - b.price);
}

// ─── Daily Voice Log (Running Memory) ───

async function logVoiceCommand(storeId: string, command: string, intent: string, productId?: string): Promise<void> {
  const today = new Date().toISOString().split('T')[0];
  const timestamp = new Date().toISOString();
  const logKey = 'DAYLOG#' + today + '#' + Date.now();

  await putItem({
    PK: 'STORE#' + storeId,
    SK: logKey,
    entityType: 'VOICE_LOG',
    storeId,
    date: today,
    timestamp,
    command,
    intent,
    productId: productId || null,
  });
}

async function getDayLog(storeId: string): Promise<Record<string, unknown>[]> {
  const today = new Date().toISOString().split('T')[0];
  return queryByPK('STORE#' + storeId, 'DAYLOG#' + today);
}

async function getDepletionCount(storeId: string, productId: string): Promise<number> {
  const logs = await getDayLog(storeId);
  return logs.filter(
    (l) => l.productId === productId && (l.intent === 'restock_command' || l.intent === 'update_stock')
  ).length;
}

// ─── Action execution ───

interface ActionResult {
  action: string;
  data: Record<string, unknown>;
  summary: string;
}

import { ulid } from 'ulid';

export async function executeAction(parsedIntent: Record<string, unknown>, storeId: string): Promise<ActionResult> {
  const intent = (parsedIntent.intent || parsedIntent.action) as string;

  switch (intent) {
    case 'availability_check':
    case 'check_inventory': {
      const query = parsedIntent.product_query as string;
      const products = await searchProducts(query);

      if (products.length === 0) {
        return { action: intent, data: { query, found: false }, summary: 'No product found matching "' + query + '". Ask the user to clarify.' };
      }

      const product = products[0];
      const inventory = await getInventory(storeId, product.productId);
      const master = PRODUCT_MASTER[product.productId];

      if (!inventory) {
        return { action: intent, data: { product, inventoryFound: false }, summary: 'Product "' + product.nameEn + '" (' + product.nameHi + ') found but no inventory record for this store.' };
      }

      await logVoiceCommand(storeId, 'check: ' + query, intent, product.productId);

      let summary = 'Product: ' + product.nameEn + ' (' + product.nameHi + '). Stock: ' + inventory.stock + ' ' + product.unit + '. Reorder point: ' + inventory.reorderPoint + '.';
      if (inventory.lowStock) summary += ' LOW STOCK — needs reorder!';
      else summary += ' Stock is adequate.';
      if (inventory.daysOfStock !== null) summary += ' Days of stock remaining: ' + inventory.daysOfStock + '.';
      if (master) summary += ' Category: ' + master.shelfType + ' (' + master.cadence + ' reorder).';

      return { action: intent, data: { product, inventory, master }, summary };
    }

    case 'restock_command': {
      const query = parsedIntent.product_query as string;
      const status = (parsedIntent.status as string) || 'depleted';
      const products = await searchProducts(query);

      if (products.length === 0) {
        return { action: intent, data: { query, found: false }, summary: 'No product found matching "' + query + '". Cannot log restock.' };
      }

      const product = products[0];
      const newStock = status === 'depleted' ? 0 : -1; // -1 means "low, don't change to 0"

      // Update inventory
      if (status === 'depleted') {
        await updateItem('STORE#' + storeId, 'INV#' + product.productId, { stock: 0, low_stock: true });
      } else {
        await updateItem('STORE#' + storeId, 'INV#' + product.productId, { low_stock: true });
      }

      // Log voice command
      await logVoiceCommand(storeId, (status === 'depleted' ? 'depleted: ' : 'low: ') + query, intent, product.productId);

      // Check depletion velocity
      const depletionCount = await getDepletionCount(storeId, product.productId);
      const master = PRODUCT_MASTER[product.productId];

      let summary = 'Noted. ' + product.nameEn + ' (' + product.nameHi + ') marked as ' + (status === 'depleted' ? 'FINISHED (0 stock)' : 'LOW STOCK') + '.';
      summary += ' Added to restock list.';

      if (depletionCount >= 2) {
        summary += ' WARNING: This item has been marked depleted/low ' + depletionCount + ' times today! Suggest increasing daily stock limit.';
      }
      if (master) {
        summary += ' Category: ' + master.shelfType + ' (' + master.cadence + ' reorder). Distributor type: ' + master.distributorType + '.';
      }

      return { action: intent, data: { product, status, depletionCount, master }, summary };
    }

    case 'update_stock': {
      const query = parsedIntent.product_query as string;
      const quantity = Number(parsedIntent.quantity) || 0;
      const products = await searchProducts(query);

      if (products.length === 0) {
        return { action: intent, data: { query, found: false }, summary: 'No product found matching "' + query + '".' };
      }

      const product = products[0];
      const inventory = await getInventory(storeId, product.productId);
      const reorderPoint = inventory ? inventory.reorderPoint : 5;
      const isLow = quantity <= reorderPoint;

      await updateItem('STORE#' + storeId, 'INV#' + product.productId, { stock: quantity, low_stock: isLow });
      await logVoiceCommand(storeId, 'update: ' + query + ' = ' + quantity, intent, product.productId);

      let summary = 'Updated. ' + product.nameEn + ' (' + product.nameHi + ') stock set to ' + quantity + ' ' + product.unit + '.';
      if (isLow) summary += ' This is below reorder point (' + reorderPoint + '). Added to restock list.';

      return { action: intent, data: { product, quantity, isLow }, summary };
    }

    case 'compare_prices': {
      const query = parsedIntent.product_query as string;
      const products = await searchProducts(query);

      if (products.length === 0) {
        return { action: intent, data: { query, found: false }, summary: 'No product found matching "' + query + '".' };
      }

      const product = products[0];
      const prices = await getPrices(product.productId);

      if (prices.length === 0) {
        return { action: intent, data: { product, pricesFound: false }, summary: 'Product "' + product.nameEn + '" found but no pricing data available.' };
      }

      const cheapest = prices[0];
      const mostExpensive = prices[prices.length - 1];
      const savingsPct = mostExpensive.price > 0 ? Math.round(((mostExpensive.price - cheapest.price) / mostExpensive.price) * 100) : 0;
      const priceList = prices.map((p) => p.supplierName + ': Rs.' + p.price + ' (MOQ: ' + p.moq + ', delivery: ' + p.deliveryDays + ' days)').join('; ');

      return {
        action: intent,
        data: { product, prices, cheapest, savingsPct },
        summary: 'Product: ' + product.nameEn + ' (' + product.nameHi + '). Prices: ' + priceList + '. Cheapest: ' + cheapest.supplierName + ' at Rs.' + cheapest.price + '. Savings: ' + savingsPct + '%.',
      };
    }

    case 'create_order': {
      const query = parsedIntent.product_query as string;
      const quantity = Number(parsedIntent.quantity) || 1;
      const supplierHint = (parsedIntent.supplier as string) || '';
      const products = await searchProducts(query);

      if (products.length === 0) {
        return { action: intent, data: { query, found: false }, summary: 'No product found matching "' + query + '". Cannot create order.' };
      }

      const product = products[0];
      const prices = await getPrices(product.productId);
      if (prices.length === 0) {
        return { action: intent, data: { product, pricesFound: false }, summary: 'No pricing data for "' + product.nameEn + '".' };
      }

      let supplier = prices[0];
      if (supplierHint) {
        const hintLower = supplierHint.toLowerCase();
        const matched = prices.find((p) => p.supplierName.toLowerCase().includes(hintLower) || p.supplierId.toLowerCase().includes(hintLower));
        if (matched) supplier = matched;
      }

      const orderId = ulid();
      const lineTotal = supplier.price * quantity;

      await putItem({
        PK: 'STORE#' + storeId,
        SK: 'ORDER#' + orderId,
        entityType: 'ORDER',
        storeId, orderId,
        items: [{ productId: product.productId, productName: product.nameEn, quantity, supplierId: supplier.supplierId, unitPrice: supplier.price, lineTotal }],
        totalAmount: lineTotal,
        status: 'DRAFT',
        supplier: supplier.supplierName,
      });

      await logVoiceCommand(storeId, 'order: ' + query + ' x' + quantity, intent, product.productId);

      return {
        action: intent,
        data: { product, supplier, quantity, orderId, lineTotal },
        summary: 'Draft order created! ' + product.nameEn + ', Qty: ' + quantity + ' ' + product.unit + ', Supplier: ' + supplier.supplierName + ', Total: Rs.' + lineTotal + '. Status: DRAFT.',
      };
    }

    case 'list_low_stock': {
      const allInventory = await getAllInventory(storeId);
      const lowStockItems = allInventory.filter((i) => i.lowStock);

      if (lowStockItems.length === 0) {
        return { action: intent, data: { totalItems: allInventory.length, lowStockCount: 0 }, summary: 'All ' + allInventory.length + ' products are well-stocked.' };
      }

      const details: Array<{ productId: string; nameEn: string; nameHi: string; stock: number; reorderPoint: number; unit: string; distributorType: string; cadence: string }> = [];
      for (const inv of lowStockItems) {
        const meta = await getItem<Record<string, unknown>>('PRODUCT#' + inv.productId, 'META');
        const master = PRODUCT_MASTER[inv.productId];
        details.push({
          productId: inv.productId,
          nameEn: (meta?.name_en as string) || inv.productId,
          nameHi: (meta?.name_hi as string) || '',
          stock: inv.stock,
          reorderPoint: inv.reorderPoint,
          unit: (meta?.unit as string) || 'units',
          distributorType: master?.distributorType || 'dry-grocery',
          cadence: master?.cadence || 'weekly',
        });
      }

      const itemList = details.map((d) => d.nameEn + ' (' + d.nameHi + '): ' + d.stock + '/' + d.reorderPoint + ' [' + d.cadence + ']').join('; ');

      return {
        action: intent,
        data: { totalItems: allInventory.length, lowStockCount: lowStockItems.length, details },
        summary: lowStockItems.length + ' items low on stock: ' + itemList,
      };
    }

    case 'summary': {
      const summaryType = (parsedIntent.type as string) || 'full';
      const allInventory = await getAllInventory(storeId);
      const lowStockItems = allInventory.filter((i) => i.lowStock);
      const outOfStock = allInventory.filter((i) => i.stock === 0);

      // Get today's voice log
      const dayLog = await getDayLog(storeId);
      const todayChanges = dayLog.length;

      // Pre-fetch meta for all low-stock items once (used by both groupings)
      const lowStockMeta: Array<{ inv: typeof lowStockItems[number]; name: string; master: (typeof PRODUCT_MASTER)[string] | undefined }> = [];
      for (const inv of lowStockItems) {
        const meta = await getItem<Record<string, unknown>>('PRODUCT#' + inv.productId, 'META');
        const master = PRODUCT_MASTER[inv.productId];
        lowStockMeta.push({
          inv,
          name: (meta?.name_en as string) || inv.productId,
          master,
        });
      }

      // Group by distributor type
      const byDistributor: Record<string, Array<{ name: string; stock: number; reorder: number }>> = {};
      for (const { inv, name, master } of lowStockMeta) {
        const distType = master?.distributorType || 'dry-grocery';
        if (!byDistributor[distType]) byDistributor[distType] = [];
        byDistributor[distType].push({
          name,
          stock: inv.stock,
          reorder: inv.reorderPoint,
        });
      }

      // Build distributor summary
      let distSummary = '';
      for (const [dtype, items] of Object.entries(byDistributor)) {
        const label = DISTRIBUTOR_LABELS[dtype as DistributorType] || dtype;
        distSummary += label + ': ' + items.map((i) => i.name + '(' + i.stock + ')').join(', ') + '. ';
      }

      // Group by reorder cadence (AC 2.2)
      const CADENCE_LABELS: Record<string, string> = {
        daily: '🔴 Daily (Urgent/रोज़ाना)',
        weekly: '🟡 Weekly (Buffer/हफ़्ते का)',
        monthly: '🟢 Monthly (Bulk/महीने का)',
      };
      const byCadence: Record<string, Array<{ name: string; stock: number; reorder: number }>> = {};
      for (const { inv, name, master } of lowStockMeta) {
        const cadence = master?.cadence || 'weekly';
        if (!byCadence[cadence]) byCadence[cadence] = [];
        byCadence[cadence].push({
          name,
          stock: inv.stock,
          reorder: inv.reorderPoint,
        });
      }

      // Build cadence summary (AC 2.2)
      let cadenceSummary = '';
      for (const cadenceKey of ['daily', 'weekly', 'monthly']) {
        const items = byCadence[cadenceKey];
        if (items && items.length > 0) {
          const label = CADENCE_LABELS[cadenceKey] || cadenceKey;
          cadenceSummary += label + ': ' + items.map((i) => i.name + '(' + i.stock + ')').join(', ') + '. ';
        }
      }

      // Weather + Festival context
      let weatherContext = '';
      let festivalContext = '';
      try {
        const weather = await getWeatherForecast('mumbai');
        if (weather.alerts.length > 0) {
          weatherContext = 'Weather alerts: ' + weather.alerts.join(' ');
        }
        if (weather.recommendedProducts.length > 0) {
          const weatherNames: string[] = [];
          for (const pid of weather.recommendedProducts.slice(0, 5)) {
            const meta = await getItem<Record<string, unknown>>('PRODUCT#' + pid, 'META');
            if (meta) weatherNames.push(meta.name_en as string);
          }
          weatherContext += ' Weather-driven demand: ' + weatherNames.join(', ') + '.';
        }
      } catch (e) {
        console.error('Weather fetch failed in summary:', e);
      }

      try {
        const festivals = getUpcomingFestivals(new Date());
        if (festivals.length > 0) {
          const fest = festivals[0];
          const daysLeft = Math.ceil((new Date(fest.date).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
          festivalContext = 'Upcoming: ' + fest.name + ' (' + fest.nameHi + ') in ' + daysLeft + ' days. Suggested extra stock: ' + fest.associatedProducts.join(', ') + '.';
        }
      } catch (e) {
        console.error('Festival check failed:', e);
      }

      // Detect velocity issues
      const velocityAlerts: string[] = [];
      const productCounts: Record<string, number> = {};
      for (const log of dayLog) {
        const pid = log.productId as string;
        if (pid && (log.intent === 'restock_command' || log.intent === 'update_stock')) {
          productCounts[pid] = (productCounts[pid] || 0) + 1;
        }
      }
      for (const [pid, count] of Object.entries(productCounts)) {
        if (count >= 2) {
          const meta = await getItem<Record<string, unknown>>('PRODUCT#' + pid, 'META');
          velocityAlerts.push((meta?.name_en as string || pid) + ' was marked low/depleted ' + count + ' times today — increase daily quota!');
        }
      }

      let summary = 'DAILY SUMMARY: Total tracked: ' + allInventory.length + '. Low stock: ' + lowStockItems.length + '. Out of stock: ' + outOfStock.length + '. Today voice commands: ' + todayChanges + '. ';
      summary += 'RESTOCK LIST BY DISTRIBUTOR: ' + distSummary;
      summary += 'RESTOCK BY URGENCY: ' + cadenceSummary;
      if (velocityAlerts.length > 0) summary += 'VELOCITY ALERTS: ' + velocityAlerts.join('; ') + '. ';
      if (weatherContext) summary += weatherContext + ' ';
      if (festivalContext) summary += festivalContext;

      return {
        action: intent,
        data: { allInventory: allInventory.length, lowStockCount: lowStockItems.length, outOfStock: outOfStock.length, todayChanges, byDistributor, byCadence, velocityAlerts, weatherContext, festivalContext },
        summary,
      };
    }

    case 'ondc_status': {
      const stats = await fetchOndcStats(storeId);
      await logVoiceCommand(storeId, 'ondc status check', intent);

      const summary = 'ONDC Store Status: ' + stats.totalListed + ' items listed on ONDC. ' +
        stats.inStock + ' items in stock, ' + stats.outOfStock + ' out of stock. ' +
        stats.ordersToday + ' ONDC orders today, revenue Rs.' + stats.revenueToday + '. ' +
        (stats.lastSyncedAt ? 'Last synced: ' + stats.lastSyncedAt : 'Catalog not yet synced.');

      return {
        action: intent,
        data: { stats },
        summary,
      };
    }

    case 'ondc_sync': {
      const syncResult = await syncCatalogToOndc(storeId);
      await logVoiceCommand(storeId, 'ondc catalog sync', intent);

      const summary = 'ONDC Catalog Sync Complete: Synced ' + syncResult.synced + ' items to ONDC catalog. ' +
        syncResult.active + ' items marked ACTIVE, ' + syncResult.outOfStock + ' items OUT_OF_STOCK.';

      return {
        action: intent,
        data: { syncResult },
        summary,
      };
    }

    case 'khata_purchase': {
      const customerName = (parsedIntent.customer_name as string || '').trim();
      const amount = Number(parsedIntent.amount) || 0;
      const items = (parsedIntent.items as string) || '';

      if (!customerName) {
        return { action: intent, data: {}, summary: 'Customer name is required. Ask the user to specify whose khata to update.' };
      }
      if (amount <= 0) {
        return { action: intent, data: {}, summary: 'Amount must be greater than zero. Ask the user for the correct amount.' };
      }

      const normalizedName = customerName.toLowerCase().replace(/\s+/g, '_');
      const txnTimestamp = Date.now();
      const txnId = 'KHATA#' + normalizedName + '#TXN#' + txnTimestamp;

      // Store the purchase transaction
      await putItem({
        PK: 'STORE#' + storeId,
        SK: txnId,
        entityType: 'KHATA_TXN',
        storeId,
        customerName,
        normalizedName,
        transactionType: 'PURCHASE',
        amount,
        items: items || null,
        dateTime: new Date().toISOString(),
      });

      // Auto-create or update customer summary
      const summaryKey = 'KHATA#' + normalizedName + '#SUMMARY';
      const existingSummary = await getItem<Record<string, unknown>>(
        'STORE#' + storeId,
        summaryKey
      );

      const previousOutstanding = Number(existingSummary?.outstanding || 0);
      const newOutstanding = previousOutstanding + amount;
      const totalPurchases = Number(existingSummary?.totalPurchases || 0) + amount;
      const purchaseCount = Number(existingSummary?.purchaseCount || 0) + 1;

      await putItem({
        PK: 'STORE#' + storeId,
        SK: summaryKey,
        entityType: 'KHATA_SUMMARY',
        storeId,
        customerName,
        normalizedName,
        outstanding: newOutstanding,
        totalPurchases,
        totalPayments: Number(existingSummary?.totalPayments || 0),
        purchaseCount,
        paymentCount: Number(existingSummary?.paymentCount || 0),
        lastTransaction: new Date().toISOString(),
        createdAt: (existingSummary?.createdAt as string) || new Date().toISOString(),
      });

      await logVoiceCommand(storeId, 'khata purchase: ' + customerName + ' Rs.' + amount, intent);

      let summary = 'Added Rs.' + amount + ' to ' + customerName + "'s khata.";
      if (items) summary += ' Items: ' + items + '.';
      summary += ' Current outstanding: Rs.' + newOutstanding + '.';

      // High outstanding alert (>10,000)
      if (newOutstanding > 10000) {
        summary += ' ⚠️ WARNING: ' + customerName + ' has crossed Rs.10,000 outstanding (Rs.' + newOutstanding + ')!';
      }

      return {
        action: intent,
        data: { customerName, amount, items, newOutstanding, previousOutstanding, alert: newOutstanding > 10000 },
        summary,
      };
    }

    case 'khata_payment': {
      const customerName = (parsedIntent.customer_name as string || '').trim();
      const amount = Number(parsedIntent.amount) || 0;

      if (!customerName) {
        return { action: intent, data: {}, summary: 'Customer name is required. Ask the user whose payment to record.' };
      }
      if (amount <= 0) {
        return { action: intent, data: {}, summary: 'Payment amount must be greater than zero.' };
      }

      const normalizedName = customerName.toLowerCase().replace(/\s+/g, '_');
      const txnTimestamp = Date.now();
      const txnId = 'KHATA#' + normalizedName + '#TXN#' + txnTimestamp;

      // Store the payment transaction
      await putItem({
        PK: 'STORE#' + storeId,
        SK: txnId,
        entityType: 'KHATA_TXN',
        storeId,
        customerName,
        normalizedName,
        transactionType: 'PAYMENT',
        amount,
        items: null,
        dateTime: new Date().toISOString(),
      });

      // Update customer summary
      const summaryKey = 'KHATA#' + normalizedName + '#SUMMARY';
      const existingSummary = await getItem<Record<string, unknown>>(
        'STORE#' + storeId,
        summaryKey
      );

      const previousOutstanding = Number(existingSummary?.outstanding || 0);
      const newOutstanding = Math.max(0, previousOutstanding - amount);
      const totalPayments = Number(existingSummary?.totalPayments || 0) + amount;
      const paymentCount = Number(existingSummary?.paymentCount || 0) + 1;

      await putItem({
        PK: 'STORE#' + storeId,
        SK: summaryKey,
        entityType: 'KHATA_SUMMARY',
        storeId,
        customerName,
        normalizedName,
        outstanding: newOutstanding,
        totalPurchases: Number(existingSummary?.totalPurchases || 0),
        totalPayments,
        purchaseCount: Number(existingSummary?.purchaseCount || 0),
        paymentCount,
        lastTransaction: new Date().toISOString(),
        createdAt: (existingSummary?.createdAt as string) || new Date().toISOString(),
      });

      await logVoiceCommand(storeId, 'khata payment: ' + customerName + ' Rs.' + amount, intent);

      let summary = 'Rs.' + amount + ' received from ' + customerName + '.';
      if (newOutstanding === 0) {
        summary += ' Balance is now ZERO — fully settled! 🎉';
      } else {
        summary += ' Remaining balance: Rs.' + newOutstanding + '.';
      }

      return {
        action: intent,
        data: { customerName, amount, newOutstanding, previousOutstanding, fullyClear: newOutstanding === 0 },
        summary,
      };
    }

    case 'khata_balance': {
      const customerName = (parsedIntent.customer_name as string || '').trim();

      if (!customerName) {
        return { action: intent, data: {}, summary: 'Customer name is required. Ask the user whose balance to check.' };
      }

      const normalizedName = customerName.toLowerCase().replace(/\s+/g, '_');
      const summaryKey = 'KHATA#' + normalizedName + '#SUMMARY';
      const existingSummary = await getItem<Record<string, unknown>>(
        'STORE#' + storeId,
        summaryKey
      );

      if (!existingSummary) {
        return {
          action: intent,
          data: { customerName, found: false },
          summary: 'No khata found for "' + customerName + '". This customer has no credit account.',
        };
      }

      const outstanding = Number(existingSummary.outstanding || 0);
      const totalPurchases = Number(existingSummary.totalPurchases || 0);
      const totalPayments = Number(existingSummary.totalPayments || 0);
      const purchaseCount = Number(existingSummary.purchaseCount || 0);
      const paymentCount = Number(existingSummary.paymentCount || 0);

      await logVoiceCommand(storeId, 'khata balance: ' + customerName, intent);

      let summary = customerName + ' has Rs.' + outstanding + ' outstanding.';
      summary += ' Total purchases: Rs.' + totalPurchases + ' (' + purchaseCount + ' transactions).';
      summary += ' Total payments: Rs.' + totalPayments + ' (' + paymentCount + ' payments).';
      if (outstanding > 10000) {
        summary += ' ⚠️ High outstanding — consider following up!';
      }

      return {
        action: intent,
        data: { customerName, outstanding, totalPurchases, totalPayments, purchaseCount, paymentCount },
        summary,
      };
    }

    case 'khata_list': {
      // Query all KHATA# items for this store, filter to SUMMARY entries
      const allKhataItems = await queryByPK('STORE#' + storeId, 'KHATA#');
      const summaries = allKhataItems.filter(
        (item) => (item.SK as string).endsWith('#SUMMARY') && Number(item.outstanding || 0) > 0
      );

      if (summaries.length === 0) {
        return {
          action: intent,
          data: { count: 0 },
          summary: 'No outstanding khata accounts. All customers have settled.',
        };
      }

      // Sort by outstanding descending
      summaries.sort((a, b) => Number(b.outstanding || 0) - Number(a.outstanding || 0));

      const totalOutstanding = summaries.reduce((sum, s) => sum + Number(s.outstanding || 0), 0);
      const highOutstanding = summaries.filter((s) => Number(s.outstanding || 0) > 10000);

      const customerList = summaries.map((s) =>
        (s.customerName as string) + ': Rs.' + s.outstanding
      ).join('; ');

      await logVoiceCommand(storeId, 'khata list all', intent);

      let summary = summaries.length + ' customers with outstanding balance. Total: Rs.' + totalOutstanding + '. ';
      summary += 'Details: ' + customerList + '.';
      if (highOutstanding.length > 0) {
        summary += ' ⚠️ ' + highOutstanding.length + ' customers over Rs.10,000: ' +
          highOutstanding.map((s) => (s.customerName as string) + '(Rs.' + s.outstanding + ')').join(', ') + '.';
      }

      return {
        action: intent,
        data: { count: summaries.length, totalOutstanding, customers: summaries, highOutstandingCount: highOutstanding.length },
        summary,
      };
    }

    case 'general_query':
    default:
      return {
        action: 'general_query',
        data: { text: parsedIntent.text || parsedIntent.product_query || '' },
        summary: 'User asked: "' + (parsedIntent.text || '') + '". Respond helpfully as Ramu Kaka. You help with: stock check, restock commands, price comparison, ordering, summaries, and proactive suggestions.',
      };
  }
}

// ─── Conversation pipeline ───

export interface ConversationPipelineResult {
  assistantText: string;
  actionRecord: ConversationAction | null;
}

export async function runConversationPipeline(
  userText: string,
  storeId: string,
): Promise<ConversationPipelineResult> {
  let assistantText: string;
  let actionRecord: ConversationAction | null = null;

  try {
    // Step 1: Intent extraction
    console.log('Step 1: Extracting intent from:', userText);
    const intentRaw = await callBedrock('amazon.nova-micro-v1:0', INTENT_SYSTEM_PROMPT, userText);
    console.log('Intent raw:', intentRaw);

    let parsedIntent: Record<string, unknown>;
    try {
      const jsonMatch = intentRaw.match(/\{[\s\S]*\}/);
      if (!jsonMatch) throw new Error('No JSON found');
      parsedIntent = JSON.parse(jsonMatch[0]);
    } catch {
      console.error('Intent parse failed, raw:', intentRaw);
      parsedIntent = { intent: 'general_query', text: userText };
    }

    console.log('Parsed intent:', JSON.stringify(parsedIntent));

    // Step 2: Execute action
    const actionResult = await executeAction(parsedIntent, storeId);
    console.log('Action result:', actionResult.summary);

    actionRecord = {
      type: ((parsedIntent.intent || parsedIntent.action || 'GENERAL_QUERY') as string).toUpperCase() as ConversationAction['type'],
      payload: parsedIntent,
      timestamp: new Date().toISOString(),
    };

    // Step 3: Generate Ramu Kaka response
    const responsePrompt = 'User said: "' + userText + '"\n\nAction performed: ' + actionResult.action + '\nData: ' + actionResult.summary + '\n\nRespond as Ramu Kaka. Detect the language the user spoke in and respond in the SAME language. Be concise, warm, specific with numbers. If this is a summary, be structured. Max 4-5 sentences.';

    assistantText = await callBedrock('amazon.nova-lite-v1:0', RESPONSE_SYSTEM_PROMPT, responsePrompt);
    console.log('Ramu Kaka response:', assistantText);
  } catch (err) {
    console.error('Pipeline failed:', err);
    assistantText = 'अरे, कुछ गड़बड़ हो गई। दोबारा बोलो ना।';
  }

  return { assistantText, actionRecord };
}

export async function persistConversationUpdate(
  storeId: string,
  conversationId: string,
  conversation: Conversation,
  userMessage: ConversationMessage,
  assistantMessage: ConversationMessage,
  actionRecord: ConversationAction | null,
): Promise<void> {
  const updatedTranscript = [...conversation.transcript, userMessage, assistantMessage];
  const updatedActions = [...(conversation.actions || [])];
  if (actionRecord) updatedActions.push(actionRecord);

  await updateItem('STORE#' + storeId, 'CONV#' + conversationId, {
    transcript: updatedTranscript,
    actions: updatedActions,
  });
}
