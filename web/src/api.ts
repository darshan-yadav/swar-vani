const API_URL = (import.meta.env.VITE_API_URL || 'https://eq2chssg7j.execute-api.us-east-1.amazonaws.com/dev').replace(/\/$/, '');

export interface ConversationStart {
  conversationId: string;
  messages?: { role: string; text: string; timestamp: string }[];
  message?: string;
}

export interface ConversationMessage {
  response: string;
  actions?: unknown[];
}

export interface InventoryItem {
  productId: string;
  productName?: string;
  stock: number;
  quantity?: number;
  reorderPoint?: number;
  reorderLevel?: number;
  lowStock?: boolean;
  daysOfStock?: number;
  avgDailySales?: number;
}

export interface InventoryResponse {
  inventory?: InventoryItem[];
  items?: InventoryItem[];
  totalItems?: number;
  lowStockCount?: number;
}

// Product name mapping (since the API only returns productId)
const PRODUCT_NAMES: Record<string, string> = {
  'P001': 'Parle-G Biscuit',
  'P002': 'Tata Salt',
  'P003': 'Maggi Noodles',
  'P004': 'Amul Butter',
  'P005': 'Surf Excel',
  'P008': 'Britannia Bread',
  'P009': 'Haldiram Namkeen',
  'P010': 'Aashirvaad Atta',
  'P014': 'Vim Dishwash',
  'P016': 'Clinic Plus Shampoo',
  'P019': 'Dettol Soap',
  'P021': 'Dabur Honey',
  'P024': 'Red Label Tea',
  'P031': 'Fortune Oil',
  'P039': 'Colgate Toothpaste',
};

export function getProductName(productId: string): string {
  return PRODUCT_NAMES[productId] || productId;
}

export async function startConversation(storeId: string, language: string): Promise<ConversationStart> {
  const res = await fetch(`${API_URL}/conversation`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ storeId, language }),
  });
  if (!res.ok) throw new Error(`Failed to start conversation: ${res.status}`);
  return res.json();
}

export async function sendMessage(conversationId: string, text: string): Promise<ConversationMessage> {
  const res = await fetch(`${API_URL}/conversation/${conversationId}/message`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text }),
  });
  if (!res.ok) throw new Error(`Failed to send message: ${res.status}`);
  const data = await res.json();
  // Normalize response format — API returns assistantMessage.text
  return {
    response: data.response || data.assistantMessage?.text || data.message || 'कोई उत्तर नहीं मिला।',
    actions: data.action ? [data.action] : data.actions,
  };
}

// ─── Voice API ───

export interface VoiceResponse {
  response: string;
  transcribedText: string;
  audioUrl: string | null;
  actions: unknown[];
}

export async function sendAudio(conversationId: string, audioBlob: Blob): Promise<VoiceResponse> {
  const base64 = await blobToBase64(audioBlob);
  const res = await fetch(`${API_URL}/conversation/${conversationId}/audio`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ audio: base64, format: 'webm' }),
  });
  if (!res.ok) throw new Error(`Voice API failed: ${res.status}`);
  const data = await res.json();
  return {
    response: data.responseText || data.response || 'कोई उत्तर नहीं मिला।',
    transcribedText: data.transcribedText || '',
    audioUrl: data.audioUrl || null,
    actions: data.action ? [data.action] : [],
  };
}

function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      resolve(result.split(',')[1]); // Remove data:audio/webm;base64, prefix
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

export async function getInventory(storeId: string): Promise<InventoryItem[]> {
  const res = await fetch(`${API_URL}/inventory?storeId=${encodeURIComponent(storeId)}`);
  if (!res.ok) throw new Error(`Failed to fetch inventory: ${res.status}`);
  const data: InventoryResponse = await res.json();
  return data.inventory || data.items || [];
}

// ─── ONDC API ───

export interface OndcCatalogItem {
  ondcItemId: string;
  name: string;
  nameHi: string;
  ondcCategory: string;
  price: number;
  sellingPrice: number;
  inStock: boolean;
  quantity: number;
  lastSyncedAt: string;
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
  todayOrders?: number;
  todayRevenue?: number;
  ordersToday?: number;
  revenueToday?: number;
}

export async function getOndcCatalog(storeId: string): Promise<OndcCatalogItem[]> {
  const res = await fetch(`${API_URL}/ondc/catalog?storeId=${encodeURIComponent(storeId)}`);
  if (!res.ok) throw new Error(`ONDC catalog fetch failed: ${res.status}`);
  const data = await res.json();
  return data.catalog || [];
}

export async function getOndcOrders(storeId: string): Promise<OndcOrder[]> {
  const res = await fetch(`${API_URL}/ondc/orders?storeId=${encodeURIComponent(storeId)}`);
  if (!res.ok) throw new Error(`ONDC orders fetch failed: ${res.status}`);
  const data = await res.json();
  return data.orders || [];
}

export async function getOndcStats(storeId: string): Promise<OndcStats> {
  const res = await fetch(`${API_URL}/ondc/stats?storeId=${encodeURIComponent(storeId)}`);
  if (!res.ok) throw new Error(`ONDC stats fetch failed: ${res.status}`);
  return await res.json();
}

export async function syncOndcCatalog(storeId: string): Promise<{ synced: number; active: number; outOfStock: number }> {
  const res = await fetch(`${API_URL}/ondc/sync`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ storeId }),
  });
  if (!res.ok) throw new Error(`ONDC sync failed: ${res.status}`);
  return await res.json();
}
