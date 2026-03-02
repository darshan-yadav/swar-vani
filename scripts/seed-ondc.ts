/**
 * Seed ONDC mock data — catalog items and sample orders
 * Run: npx tsx scripts/seed-ondc.ts
 */
import { DynamoDBClient, BatchWriteItemCommand } from '@aws-sdk/client-dynamodb';
import { marshall } from '@aws-sdk/util-dynamodb';

const client = new DynamoDBClient({ region: 'us-east-1' });
const TABLE_NAME = 'swar-vani-data';

// ─── Product data (matching seed-data.ts) ───
const products = [
  { id: 'P001', name_en: 'Parle-G Glucose Biscuit', name_hi: 'पारले-जी ग्लूकोज बिस्कुट', category: 'Biscuits' },
  { id: 'P002', name_en: 'Maggi 2-Minute Noodles', name_hi: 'मैगी 2-मिनट नूडल्स', category: 'Noodles' },
  { id: 'P003', name_en: 'Amul Taaza Milk 500ml', name_hi: 'अमूल ताज़ा दूध', category: 'Dairy' },
  { id: 'P004', name_en: 'Tata Salt 1kg', name_hi: 'टाटा नमक', category: 'Spices & Salt' },
  { id: 'P005', name_en: 'Surf Excel Easy Wash 1kg', name_hi: 'सर्फ़ एक्सेल ईज़ी वॉश', category: 'Detergent' },
  { id: 'P006', name_en: 'Vim Dishwash Bar 200g', name_hi: 'विम डिशवॉश बार', category: 'Cleaning' },
  { id: 'P007', name_en: 'Britannia Good Day Butter 250g', name_hi: 'ब्रिटानिया गुड डे बटर', category: 'Biscuits' },
  { id: 'P008', name_en: 'Aashirvaad Atta 5kg', name_hi: 'आशीर्वाद आटा', category: 'Flour' },
  { id: 'P009', name_en: 'Fortune Sunflower Oil 1L', name_hi: 'फॉर्च्यून सनफ्लावर तेल', category: 'Cooking Oil' },
  { id: 'P010', name_en: 'Coca-Cola 2L', name_hi: 'कोका-कोला', category: 'Beverages' },
  { id: 'P011', name_en: 'Thums Up 2L', name_hi: 'थम्स अप', category: 'Beverages' },
  { id: 'P012', name_en: 'Lays Classic Salted 52g', name_hi: 'लेज़ क्लासिक नमकीन', category: 'Snacks' },
  { id: 'P013', name_en: 'Haldiram Aloo Bhujia 200g', name_hi: 'हल्दीराम आलू भुजिया', category: 'Snacks' },
  { id: 'P014', name_en: 'Brooke Bond Red Label Tea 500g', name_hi: 'ब्रुक बॉन्ड रेड लेबल चाय', category: 'Tea & Coffee' },
  { id: 'P015', name_en: 'Nescafe Classic 50g', name_hi: 'नेस्कैफे क्लासिक', category: 'Tea & Coffee' },
  { id: 'P016', name_en: 'Colgate Strong Teeth 200g', name_hi: 'कोलगेट स्ट्रॉन्ग टीथ', category: 'Personal Care' },
  { id: 'P017', name_en: 'Dettol Soap 125g', name_hi: 'डेटॉल साबुन', category: 'Personal Care' },
  { id: 'P018', name_en: 'Clinic Plus Shampoo 175ml', name_hi: 'क्लिनिक प्लस शैम्पू', category: 'Personal Care' },
  { id: 'P019', name_en: 'India Gate Basmati Rice 5kg', name_hi: 'इंडिया गेट बासमती चावल', category: 'Rice' },
  { id: 'P020', name_en: 'Toor Dal 1kg', name_hi: 'तूर दाल', category: 'Pulses' },
  { id: 'P021', name_en: 'Sugar 1kg', name_hi: 'चीनी', category: 'Essentials' },
  { id: 'P022', name_en: 'MDH Chana Masala 100g', name_hi: 'एमडीएच चना मसाला', category: 'Spices & Salt' },
  { id: 'P023', name_en: 'Amul Butter 500g', name_hi: 'अमूल बटर', category: 'Dairy' },
  { id: 'P024', name_en: 'Cadbury Dairy Milk 50g', name_hi: 'कैडबरी डेयरी मिल्क', category: 'Chocolate' },
  { id: 'P025', name_en: 'Kurkure Masala Munch 90g', name_hi: 'कुरकुरे मसाला मंच', category: 'Snacks' },
  { id: 'P026', name_en: 'Dabur Real Mango Juice 1L', name_hi: 'डाबर रियल आम का जूस', category: 'Beverages' },
  { id: 'P027', name_en: 'Harpic Power Plus 500ml', name_hi: 'हार्पिक पावर प्लस', category: 'Cleaning' },
  { id: 'P028', name_en: 'Whisper Ultra Clean XL', name_hi: 'व्हिस्पर अल्ट्रा क्लीन', category: 'Personal Care' },
  { id: 'P029', name_en: 'Lifebuoy Handwash 190ml', name_hi: 'लाइफबॉय हैंडवॉश', category: 'Personal Care' },
  { id: 'P030', name_en: 'Rin Detergent Bar 250g', name_hi: 'रिन डिटर्जेंट बार', category: 'Detergent' },
  { id: 'P031', name_en: 'Kissan Tomato Ketchup 500g', name_hi: 'किसान टोमैटो केचप', category: 'Sauces' },
  { id: 'P032', name_en: 'Everest Garam Masala 100g', name_hi: 'एवरेस्ट गरम मसाला', category: 'Spices & Salt' },
  { id: 'P033', name_en: 'Mother Dairy Curd 400g', name_hi: 'मदर डेयरी दही', category: 'Dairy' },
  { id: 'P034', name_en: 'Bisleri Water 1L', name_hi: 'बिसलेरी पानी', category: 'Beverages' },
  { id: 'P035', name_en: 'Patanjali Ghee 1L', name_hi: 'पतंजलि घी', category: 'Dairy' },
  { id: 'P036', name_en: 'Saffola Gold Oil 1L', name_hi: 'सैफोला गोल्ड तेल', category: 'Cooking Oil' },
  { id: 'P037', name_en: 'Head & Shoulders Shampoo 180ml', name_hi: 'हेड एंड शोल्डर्स शैम्पू', category: 'Personal Care' },
  { id: 'P038', name_en: 'Amul Ice Cream Vanilla 750ml', name_hi: 'अमूल आइसक्रीम वनीला', category: 'Frozen' },
  { id: 'P039', name_en: 'Britannia Bread 400g', name_hi: 'ब्रिटानिया ब्रेड', category: 'Bakery' },
  { id: 'P040', name_en: 'Catch Sprinkler Salt 200g', name_hi: 'कैच स्प्रिंकलर नमक', category: 'Spices & Salt' },
  { id: 'P041', name_en: 'Bambino Vermicelli 400g', name_hi: 'बैम्बिनो सेवइयां', category: 'Noodles' },
  { id: 'P042', name_en: 'Fevicol SH 50g', name_hi: 'फेविकोल', category: 'Stationery' },
  { id: 'P043', name_en: 'Good Knight Liquid Refill 45ml', name_hi: 'गुड नाइट लिक्विड रिफिल', category: 'Home Care' },
  { id: 'P044', name_en: 'Lijjat Papad 200g', name_hi: 'लिज्जत पापड़', category: 'Snacks' },
  { id: 'P045', name_en: 'Frooti Mango Drink 200ml', name_hi: 'फ्रूटी आम पेय', category: 'Beverages' },
  { id: 'P046', name_en: 'Closeup Toothpaste 150g', name_hi: 'क्लोज़अप टूथपेस्ट', category: 'Personal Care' },
  { id: 'P047', name_en: 'Godrej No.1 Soap 100g', name_hi: 'गोदरेज नंबर 1 साबुन', category: 'Personal Care' },
  { id: 'P048', name_en: 'Glucon-D Orange 500g', name_hi: 'ग्लूकॉन-डी ऑरेंज', category: 'Health Drinks' },
  { id: 'P049', name_en: 'Agarpara Mustard Oil 1L', name_hi: 'सरसों का तेल', category: 'Cooking Oil' },
  { id: 'P050', name_en: 'Nirma Washing Powder 1kg', name_hi: 'निरमा वॉशिंग पाउडर', category: 'Detergent' },
];

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

// MRP per unit (retail price)
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

// Stock levels for ONDC catalog (from store-001 inventory + extras)
const stockLevels: Record<string, number> = {
  P001: 2, P002: 8, P003: 1, P004: 12, P005: 3,
  P006: 15, P007: 10, P008: 6, P009: 4, P010: 10,
  P011: 8, P012: 20, P013: 15, P014: 5, P015: 12,
  P016: 7, P017: 18, P018: 9, P019: 2, P020: 14,
  P021: 15, P022: 22, P023: 8, P024: 0, P025: 16,
  P026: 10, P027: 6, P028: 12, P029: 14, P030: 20,
  P031: 3, P032: 18, P033: 5, P034: 25, P035: 4,
  P036: 7, P037: 11, P038: 3, P039: 8, P040: 30,
  P041: 10, P042: 20, P043: 15, P044: 12, P045: 30,
  P046: 14, P047: 16, P048: 8, P049: 6, P050: 10,
};

// ─── ONDC Orders ───
const now = new Date();
const today = now.toISOString().split('T')[0];

const ondcOrders = [
  {
    orderId: 'ONDC-ORD-001',
    buyerName: 'Priya Sharma',
    buyerAddress: 'B-204, Sai Krupa CHS, Dadar West, Mumbai 400028',
    items: [
      { productId: 'P001', name: 'Parle-G Glucose Biscuit', qty: 2, price: 10 },
      { productId: 'P003', name: 'Amul Taaza Milk 500ml', qty: 3, price: 24 },
    ],
    totalAmount: 92,
    status: 'DELIVERED',
    createdAt: `${today}T08:30:00Z`,
    ondcTransactionId: 'TXN-ONDC-20260227-001',
  },
  {
    orderId: 'ONDC-ORD-002',
    buyerName: 'Amit Patel',
    buyerAddress: '12, Shivaji Nagar, Andheri East, Mumbai 400069',
    items: [
      { productId: 'P014', name: 'Brooke Bond Red Label Tea 500g', qty: 1, price: 276 },
      { productId: 'P008', name: 'Aashirvaad Atta 5kg', qty: 1, price: 266 },
      { productId: 'P021', name: 'Sugar 1kg', qty: 2, price: 46 },
    ],
    totalAmount: 634,
    status: 'CONFIRMED',
    createdAt: `${today}T09:15:00Z`,
    ondcTransactionId: 'TXN-ONDC-20260227-002',
  },
  {
    orderId: 'ONDC-ORD-003',
    buyerName: 'Sneha Kulkarni',
    buyerAddress: 'Flat 301, Ganesh Towers, Parel, Mumbai 400012',
    items: [
      { productId: 'P016', name: 'Colgate Strong Teeth 200g', qty: 1, price: 49 },
      { productId: 'P017', name: 'Dettol Soap 125g', qty: 3, price: 40 },
    ],
    totalAmount: 169,
    status: 'DISPATCHED',
    createdAt: `${today}T10:00:00Z`,
    ondcTransactionId: 'TXN-ONDC-20260227-003',
  },
  {
    orderId: 'ONDC-ORD-004',
    buyerName: 'Rajesh Gupta',
    buyerAddress: '45-A, MG Road, Borivali West, Mumbai 400092',
    items: [
      { productId: 'P010', name: 'Coca-Cola 2L', qty: 2, price: 76 },
      { productId: 'P012', name: 'Lays Classic Salted 52g', qty: 5, price: 19 },
    ],
    totalAmount: 247,
    status: 'PENDING',
    createdAt: `${today}T11:30:00Z`,
    ondcTransactionId: 'TXN-ONDC-20260227-004',
  },
  {
    orderId: 'ONDC-ORD-005',
    buyerName: 'Meera Iyer',
    buyerAddress: '7/C, Sea View Apartments, Worli, Mumbai 400018',
    items: [
      { productId: 'P009', name: 'Fortune Sunflower Oil 1L', qty: 1, price: 124 },
      { productId: 'P019', name: 'India Gate Basmati Rice 5kg', qty: 1, price: 428 },
      { productId: 'P020', name: 'Toor Dal 1kg', qty: 2, price: 157 },
    ],
    totalAmount: 866,
    status: 'CONFIRMED',
    createdAt: `${today}T07:45:00Z`,
    ondcTransactionId: 'TXN-ONDC-20260227-005',
  },
];

// ─── Batch write helper ───
async function batchWriteItems(items: any[]) {
  for (let i = 0; i < items.length; i += 25) {
    const batch = items.slice(i, i + 25);
    const params = {
      RequestItems: {
        [TABLE_NAME]: batch.map(item => ({
          PutRequest: { Item: marshall(item, { removeUndefinedValues: true }) },
        })),
      },
    };
    await client.send(new BatchWriteItemCommand(params));
    console.log(`  Written ${Math.min(i + 25, items.length)}/${items.length} items`);
  }
}

async function seedOndc() {
  console.log('🌐 Seeding ONDC mock data...\n');

  const nowStr = new Date().toISOString();

  // 1. ONDC Catalog Items (all 50 products)
  console.log('📋 Seeding ONDC catalog (50 items)...');
  const catalogItems = products.map((p) => {
    const stock = stockLevels[p.id] || 0;
    const mrp = MRP_MAP[p.id] || 100;
    const sellingPrice = Math.round(mrp * 0.95);
    const ondcStatus = stock > 0 ? 'ACTIVE' : 'OUT_OF_STOCK';

    return {
      PK: 'STORE#store-001',
      SK: `ONDC#CATALOG#${p.id}`,
      entityType: 'ONDC_CATALOG',
      storeId: 'store-001',
      ondcItemId: `ONDC-${p.id}`,
      name: p.name_en,
      nameHi: p.name_hi,
      ondcCategory: CATEGORY_MAP[p.category] || 'Grocery > Snacks & Branded Foods',
      price: mrp,
      sellingPrice,
      inStock: stock > 0,
      quantity: stock,
      lastSyncedAt: nowStr,
      ondcStatus,
      productId: p.id,
      category: p.category,
      createdAt: nowStr,
      updatedAt: nowStr,
    };
  });
  await batchWriteItems(catalogItems);

  // 2. ONDC Orders
  console.log('🛍️  Seeding 5 ONDC orders...');
  const orderItems = ondcOrders.map((order) => ({
    PK: 'STORE#store-001',
    SK: `ONDC#ORDER#${order.orderId}`,
    entityType: 'ONDC_ORDER',
    storeId: 'store-001',
    ...order,
    createdAt: order.createdAt,
    updatedAt: nowStr,
  }));
  await batchWriteItems(orderItems);

  console.log('\n✅ ONDC seed complete!');
  console.log('   50 ONDC catalog items (49 active, 1 out-of-stock)');
  console.log('   5 ONDC orders (1 delivered, 2 confirmed, 1 dispatched, 1 pending)');
  const totalRevenue = ondcOrders.reduce((sum, o) => sum + o.totalAmount, 0);
  console.log(`   Today's ONDC revenue: ₹${totalRevenue}`);
}

seedOndc().catch(console.error);
