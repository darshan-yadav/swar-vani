// ─── Entity Types for Swar-Vani Single-Table DynamoDB Design ───

/** Base fields present on every DynamoDB item */
export interface BaseItem {
  PK: string;
  SK: string;
  GSI1PK?: string;
  GSI1SK?: string;
  GSI2PK?: string;
  GSI2SK?: string;
  createdAt: string;
  updatedAt: string;
}

// ─── Store ───

export interface StoreProfile extends BaseItem {
  entityType: 'STORE_PROFILE';
  storeId: string;
  name: string;
  phone: string;
  language: 'hi' | 'en' | 'ta' | 'te' | 'kn' | 'mr';
  monthlyBudget: number;
  location: {
    city: string;
    state: string;
    pincode: string;
    address: string;
  };
}

export interface InventoryItem extends BaseItem {
  entityType: 'INVENTORY';
  storeId: string;
  productId: string;
  stock: number;
  reorderPoint: number;
  avgDailySales: number;
  lastRestocked?: string;
}

export type OrderStatus = 'DRAFT' | 'CONFIRMED' | 'DISPATCHED' | 'DELIVERED' | 'CANCELLED';

export interface OrderLineItem {
  productId: string;
  productName: string;
  quantity: number;
  supplierId: string;
  unitPrice: number;
  lineTotal: number;
}

export interface Order extends BaseItem {
  entityType: 'ORDER';
  storeId: string;
  orderId: string;
  items: OrderLineItem[];
  totalAmount: number;
  status: OrderStatus;
  supplier?: string;
  confirmedAt?: string;
  deliveredAt?: string;
}

export interface Conversation extends BaseItem {
  entityType: 'CONVERSATION';
  storeId: string;
  conversationId: string;
  language: string;
  transcript: ConversationMessage[];
  actions: ConversationAction[];
  audioUri?: string;
  status: 'ACTIVE' | 'CLOSED';
}

export interface ConversationMessage {
  role: 'user' | 'assistant';
  text: string;
  timestamp: string;
}

export interface ConversationAction {
  type: 'SEARCH' | 'ADD_TO_ORDER' | 'CHECK_INVENTORY' | 'PRICE_CHECK' | 'CONFIRM_ORDER' | 'KHATA_PURCHASE' | 'KHATA_PAYMENT' | 'KHATA_BALANCE' | 'KHATA_LIST' | string;
  payload: Record<string, unknown>;
  timestamp: string;
}

// ─── Product ───

export interface ProductMeta extends BaseItem {
  entityType: 'PRODUCT_META';
  productId: string;
  nameEn: string;
  nameHi: string;
  category: string;
  unit: string;
  packSize: string;
  sku: string;
  barcode?: string;
}

export interface ProductPrice extends BaseItem {
  entityType: 'PRODUCT_PRICE';
  productId: string;
  supplierId: string;
  supplierName: string;
  price: number;
  moq: number;
  deliveryDays: number;
}

export interface ProductAlias extends BaseItem {
  entityType: 'PRODUCT_ALIAS';
  productId: string;
  language: string;
  aliases: string[];
}

// ─── API Request/Response types ───

export interface ApiResponse {
  statusCode: number;
  headers: Record<string, string>;
  body: string;
}

export interface CreateOrderRequest {
  storeId: string;
  items: {
    productId: string;
    quantity: number;
    supplierId: string;
  }[];
}

export interface UpdateInventoryRequest {
  storeId: string;
  quantity: number;
}

export interface StartConversationRequest {
  storeId: string;
  language: string;
}

export interface SendMessageRequest {
  text: string;
}

export interface RegisterRequest {
  phone: string;
  storeName: string;
  language?: string;
}

export interface VerifyRequest {
  phone: string;
  otp: string;
}
