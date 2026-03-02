import { DynamoDBClient, BatchWriteItemCommand } from '@aws-sdk/client-dynamodb';
import { marshall } from '@aws-sdk/util-dynamodb';

const client = new DynamoDBClient({ region: 'us-east-1' });
const TABLE_NAME = 'swar-vani-data';

// ─── 50 FMCG Products ───
const products = [
  { id: 'P001', name_en: 'Parle-G Glucose Biscuit', name_hi: 'पारले-जी ग्लूकोज बिस्कुट', category: 'Biscuits', unit: 'carton (48 packs)', barcode: '8901725133610' },
  { id: 'P002', name_en: 'Maggi 2-Minute Noodles', name_hi: 'मैगी 2-मिनट नूडल्स', category: 'Noodles', unit: 'carton (48 packs)', barcode: '8901058001150' },
  { id: 'P003', name_en: 'Amul Taaza Milk 500ml', name_hi: 'अमूल ताज़ा दूध', category: 'Dairy', unit: 'crate (20 packets)', barcode: '8901262150019' },
  { id: 'P004', name_en: 'Tata Salt 1kg', name_hi: 'टाटा नमक', category: 'Spices & Salt', unit: 'bag (20 packs)', barcode: '8901725181234' },
  { id: 'P005', name_en: 'Surf Excel Easy Wash 1kg', name_hi: 'सर्फ़ एक्सेल ईज़ी वॉश', category: 'Detergent', unit: 'carton (12 packs)', barcode: '8901030622121' },
  { id: 'P006', name_en: 'Vim Dishwash Bar 200g', name_hi: 'विम डिशवॉश बार', category: 'Cleaning', unit: 'carton (48 bars)', barcode: '8901030312267' },
  { id: 'P007', name_en: 'Britannia Good Day Butter 250g', name_hi: 'ब्रिटानिया गुड डे बटर', category: 'Biscuits', unit: 'carton (24 packs)', barcode: '8901063010185' },
  { id: 'P008', name_en: 'Aashirvaad Atta 5kg', name_hi: 'आशीर्वाद आटा', category: 'Flour', unit: 'bag (5 packs)', barcode: '8901063553019' },
  { id: 'P009', name_en: 'Fortune Sunflower Oil 1L', name_hi: 'फॉर्च्यून सनफ्लावर तेल', category: 'Cooking Oil', unit: 'carton (12 bottles)', barcode: '8901058005158' },
  { id: 'P010', name_en: 'Coca-Cola 2L', name_hi: 'कोका-कोला', category: 'Beverages', unit: 'case (9 bottles)', barcode: '5449000000996' },
  { id: 'P011', name_en: 'Thums Up 2L', name_hi: 'थम्स अप', category: 'Beverages', unit: 'case (9 bottles)', barcode: '8901765117230' },
  { id: 'P012', name_en: 'Lays Classic Salted 52g', name_hi: 'लेज़ क्लासिक नमकीन', category: 'Snacks', unit: 'carton (48 packs)', barcode: '8901491101400' },
  { id: 'P013', name_en: 'Haldiram Aloo Bhujia 200g', name_hi: 'हल्दीराम आलू भुजिया', category: 'Snacks', unit: 'carton (24 packs)', barcode: '8904004401767' },
  { id: 'P014', name_en: 'Brooke Bond Red Label Tea 500g', name_hi: 'ब्रुक बॉन्ड रेड लेबल चाय', category: 'Tea & Coffee', unit: 'carton (24 packs)', barcode: '8901030705100' },
  { id: 'P015', name_en: 'Nescafe Classic 50g', name_hi: 'नेस्कैफे क्लासिक', category: 'Tea & Coffee', unit: 'carton (24 jars)', barcode: '7613036080019' },
  { id: 'P016', name_en: 'Colgate Strong Teeth 200g', name_hi: 'कोलगेट स्ट्रॉन्ग टीथ', category: 'Personal Care', unit: 'carton (48 tubes)', barcode: '8901314200105' },
  { id: 'P017', name_en: 'Dettol Soap 125g', name_hi: 'डेटॉल साबुन', category: 'Personal Care', unit: 'carton (48 bars)', barcode: '8901396369936' },
  { id: 'P018', name_en: 'Clinic Plus Shampoo 175ml', name_hi: 'क्लिनिक प्लस शैम्पू', category: 'Personal Care', unit: 'carton (24 bottles)', barcode: '8901030572678' },
  { id: 'P019', name_en: 'India Gate Basmati Rice 5kg', name_hi: 'इंडिया गेट बासमती चावल', category: 'Rice', unit: 'bag (4 packs)', barcode: '8901725181111' },
  { id: 'P020', name_en: 'Toor Dal 1kg', name_hi: 'तूर दाल', category: 'Pulses', unit: 'bag (10 packs)', barcode: '8901058000001' },
  { id: 'P021', name_en: 'Sugar 1kg', name_hi: 'चीनी', category: 'Essentials', unit: 'bag (25 packs)', barcode: '0000000000021' },
  { id: 'P022', name_en: 'MDH Chana Masala 100g', name_hi: 'एमडीएच चना मसाला', category: 'Spices & Salt', unit: 'carton (48 packs)', barcode: '8902519002108' },
  { id: 'P023', name_en: 'Amul Butter 500g', name_hi: 'अमूल बटर', category: 'Dairy', unit: 'carton (20 packs)', barcode: '8901262011105' },
  { id: 'P024', name_en: 'Cadbury Dairy Milk 50g', name_hi: 'कैडबरी डेयरी मिल्क', category: 'Chocolate', unit: 'box (40 bars)', barcode: '7622210100344' },
  { id: 'P025', name_en: 'Kurkure Masala Munch 90g', name_hi: 'कुरकुरे मसाला मंच', category: 'Snacks', unit: 'carton (48 packs)', barcode: '8901491502078' },
  { id: 'P026', name_en: 'Dabur Real Mango Juice 1L', name_hi: 'डाबर रियल आम का जूस', category: 'Beverages', unit: 'carton (12 packs)', barcode: '8901207000089' },
  { id: 'P027', name_en: 'Harpic Power Plus 500ml', name_hi: 'हार्पिक पावर प्लस', category: 'Cleaning', unit: 'carton (24 bottles)', barcode: '8901396372936' },
  { id: 'P028', name_en: 'Whisper Ultra Clean XL', name_hi: 'व्हिस्पर अल्ट्रा क्लीन', category: 'Personal Care', unit: 'carton (24 packs)', barcode: '4902430581103' },
  { id: 'P029', name_en: 'Lifebuoy Handwash 190ml', name_hi: 'लाइफबॉय हैंडवॉश', category: 'Personal Care', unit: 'carton (24 bottles)', barcode: '8901030711206' },
  { id: 'P030', name_en: 'Rin Detergent Bar 250g', name_hi: 'रिन डिटर्जेंट बार', category: 'Detergent', unit: 'carton (48 bars)', barcode: '8901030302923' },
  { id: 'P031', name_en: 'Kissan Tomato Ketchup 500g', name_hi: 'किसान टोमैटो केचप', category: 'Sauces', unit: 'carton (24 bottles)', barcode: '8901030723704' },
  { id: 'P032', name_en: 'Everest Garam Masala 100g', name_hi: 'एवरेस्ट गरम मसाला', category: 'Spices & Salt', unit: 'carton (48 packs)', barcode: '8901552003100' },
  { id: 'P033', name_en: 'Mother Dairy Curd 400g', name_hi: 'मदर डेयरी दही', category: 'Dairy', unit: 'crate (20 cups)', barcode: '8901262350014' },
  { id: 'P034', name_en: 'Bisleri Water 1L', name_hi: 'बिसलेरी पानी', category: 'Beverages', unit: 'case (12 bottles)', barcode: '8906009530017' },
  { id: 'P035', name_en: 'Patanjali Ghee 1L', name_hi: 'पतंजलि घी', category: 'Dairy', unit: 'carton (12 jars)', barcode: '8904109460012' },
  { id: 'P036', name_en: 'Saffola Gold Oil 1L', name_hi: 'सैफोला गोल्ड तेल', category: 'Cooking Oil', unit: 'carton (12 bottles)', barcode: '8904004400519' },
  { id: 'P037', name_en: 'Head & Shoulders Shampoo 180ml', name_hi: 'हेड एंड शोल्डर्स शैम्पू', category: 'Personal Care', unit: 'carton (24 bottles)', barcode: '4902430401203' },
  { id: 'P038', name_en: 'Amul Ice Cream Vanilla 750ml', name_hi: 'अमूल आइसक्रीम वनीला', category: 'Frozen', unit: 'carton (12 tubs)', barcode: '8901262250017' },
  { id: 'P039', name_en: 'Britannia Bread 400g', name_hi: 'ब्रिटानिया ब्रेड', category: 'Bakery', unit: 'crate (12 loaves)', barcode: '8901063210080' },
  { id: 'P040', name_en: 'Catch Sprinkler Salt 200g', name_hi: 'कैच स्प्रिंकलर नमक', category: 'Spices & Salt', unit: 'carton (48 bottles)', barcode: '8901058002156' },
  { id: 'P041', name_en: 'Bambino Vermicelli 400g', name_hi: 'बैम्बिनो सेवइयां', category: 'Noodles', unit: 'carton (24 packs)', barcode: '8901058000019' },
  { id: 'P042', name_en: 'Fevicol SH 50g', name_hi: 'फेविकोल', category: 'Stationery', unit: 'box (50 tubes)', barcode: '8901241033019' },
  { id: 'P043', name_en: 'Good Knight Liquid Refill 45ml', name_hi: 'गुड नाइट लिक्विड रिफिल', category: 'Home Care', unit: 'carton (24 refills)', barcode: '8901023010118' },
  { id: 'P044', name_en: 'Lijjat Papad 200g', name_hi: 'लिज्जत पापड़', category: 'Snacks', unit: 'carton (30 packs)', barcode: '8901552001205' },
  { id: 'P045', name_en: 'Frooti Mango Drink 200ml', name_hi: 'फ्रूटी आम पेय', category: 'Beverages', unit: 'case (36 tetra packs)', barcode: '8901207002009' },
  { id: 'P046', name_en: 'Closeup Toothpaste 150g', name_hi: 'क्लोज़अप टूथपेस्ट', category: 'Personal Care', unit: 'carton (48 tubes)', barcode: '8901030411205' },
  { id: 'P047', name_en: 'Godrej No.1 Soap 100g', name_hi: 'गोदरेज नंबर 1 साबुन', category: 'Personal Care', unit: 'carton (48 bars)', barcode: '8901023021114' },
  { id: 'P048', name_en: 'Glucon-D Orange 500g', name_hi: 'ग्लूकॉन-डी ऑरेंज', category: 'Health Drinks', unit: 'carton (24 packs)', barcode: '8901023009129' },
  { id: 'P049', name_en: 'Agarpara Mustard Oil 1L', name_hi: 'सरसों का तेल', category: 'Cooking Oil', unit: 'carton (12 bottles)', barcode: '0000000000049' },
  { id: 'P050', name_en: 'Nirma Washing Powder 1kg', name_hi: 'निरमा वॉशिंग पाउडर', category: 'Detergent', unit: 'bag (12 packs)', barcode: '8901260220019' },
];

// ─── Suppliers with pricing ───
const suppliers = [
  { id: 'udaan', name: 'Udaan', delivery_days: 1, reliability: 92 },
  { id: 'jumbotail', name: 'Jumbotail', delivery_days: 2, reliability: 88 },
  { id: 'localmart', name: 'LocalMart Wholesale', delivery_days: 0, reliability: 95 },
];

// Generate pricing: base price with ±10% variation per supplier
function generatePricing(productId: string, basePrice: number): any[] {
  return suppliers.map(s => {
    const variation = s.id === 'jumbotail' ? 0.95 : s.id === 'udaan' ? 1.0 : 1.08;
    const price = Math.round(basePrice * variation);
    const moq = s.id === 'localmart' ? 1 : s.id === 'udaan' ? 3 : 2;
    return {
      PK: `PRODUCT#${productId}`,
      SK: `PRICE#${s.id}`,
      GSI1PK: `PRICE#${s.id}`,
      GSI1SK: `PRODUCT#${productId}`,
      supplier_id: s.id,
      supplier_name: s.name,
      price,
      moq,
      delivery_days: s.delivery_days,
      reliability_pct: s.reliability,
      updated_at: new Date().toISOString(),
    };
  });
}

const basePrices: Record<string, number> = {
  P001: 485, P002: 520, P003: 240, P004: 280, P005: 360,
  P006: 192, P007: 420, P008: 310, P009: 180, P010: 95,
  P011: 95, P012: 960, P013: 480, P014: 540, P015: 720,
  P016: 576, P017: 624, P018: 432, P019: 680, P020: 150,
  P021: 48, P022: 576, P023: 560, P024: 1600, P025: 960,
  P026: 360, P027: 576, P028: 720, P029: 480, P030: 384,
  P031: 480, P032: 576, P033: 240, P034: 144, P035: 600,
  P036: 240, P037: 720, P038: 1440, P039: 420, P040: 384,
  P041: 360, P042: 250, P043: 384, P044: 450, P045: 216,
  P046: 576, P047: 384, P048: 480, P049: 180, P050: 264,
};

// ─── Demo stores ───
const stores = [
  {
    PK: 'STORE#store-001', SK: 'PROFILE',
    GSI1PK: 'PROFILE', GSI1SK: 'STORE#store-001',
    store_id: 'store-001',
    name: 'Ramesh General Store',
    owner_name: 'Ramesh Kumar',
    phone: '+91-9876543210',
    language: 'hi-IN',
    location: 'Mumbai, Maharashtra',
    pincode: '400001',
    daily_budget: 25000,
    gst: '27AABCU9603R1ZM',
    created_at: '2026-01-15T10:00:00Z',
  },
  {
    PK: 'STORE#store-002', SK: 'PROFILE',
    GSI1PK: 'PROFILE', GSI1SK: 'STORE#store-002',
    store_id: 'store-002',
    name: 'Lakshmi Provision Store',
    owner_name: 'Lakshmi Devi',
    phone: '+91-9123456789',
    language: 'hi-IN',
    location: 'Chennai, Tamil Nadu',
    pincode: '600001',
    daily_budget: 15000,
    gst: '33AABCU9603R1ZN',
    created_at: '2026-02-01T10:00:00Z',
  },
];

// ─── Inventory for store-001 (15 products) ───
const store1Inventory = [
  { productId: 'P001', stock: 2, reorder: 5 },  // LOW
  { productId: 'P002', stock: 8, reorder: 5 },
  { productId: 'P003', stock: 1, reorder: 3 },  // LOW
  { productId: 'P004', stock: 12, reorder: 5 },
  { productId: 'P005', stock: 3, reorder: 4 },  // LOW
  { productId: 'P008', stock: 6, reorder: 3 },
  { productId: 'P009', stock: 4, reorder: 4 },
  { productId: 'P010', stock: 10, reorder: 6 },
  { productId: 'P014', stock: 5, reorder: 4 },
  { productId: 'P016', stock: 7, reorder: 5 },
  { productId: 'P019', stock: 2, reorder: 3 },  // LOW
  { productId: 'P021', stock: 15, reorder: 10 },
  { productId: 'P024', stock: 0, reorder: 5 },  // OUT OF STOCK
  { productId: 'P031', stock: 3, reorder: 3 },
  { productId: 'P039', stock: 8, reorder: 4 },
];

// ─── Inventory for store-002 (10 products) ───
const store2Inventory = [
  { productId: 'P001', stock: 10, reorder: 5 },
  { productId: 'P003', stock: 4, reorder: 5 },  // LOW
  { productId: 'P008', stock: 3, reorder: 3 },
  { productId: 'P014', stock: 1, reorder: 3 },  // LOW
  { productId: 'P019', stock: 5, reorder: 3 },
  { productId: 'P020', stock: 8, reorder: 5 },
  { productId: 'P021', stock: 20, reorder: 10 },
  { productId: 'P032', stock: 6, reorder: 4 },
  { productId: 'P035', stock: 2, reorder: 3 },  // LOW
  { productId: 'P044', stock: 12, reorder: 5 },
];

// ─── Sample orders ───
const sampleOrders = [
  {
    PK: 'STORE#store-001', SK: 'ORDER#ord-001',
    GSI1PK: 'ORDER#ord-001', GSI1SK: 'STORE#store-001',
    GSI2PK: 'STORE#store-001', GSI2SK: '2026-02-20T14:30:00Z',
    order_id: 'ord-001',
    store_id: 'store-001',
    items: [
      { product_id: 'P001', product_name: 'Parle-G Glucose Biscuit', quantity: 10, price: 472, supplier: 'jumbotail' },
      { product_id: 'P003', product_name: 'Amul Taaza Milk 500ml', quantity: 5, price: 228, supplier: 'jumbotail' },
    ],
    total: 5860,
    status: 'delivered',
    created_at: '2026-02-20T14:30:00Z',
    confirmed_at: '2026-02-20T14:31:00Z',
    delivered_at: '2026-02-22T09:00:00Z',
    created_via: 'voice',
  },
  {
    PK: 'STORE#store-001', SK: 'ORDER#ord-002',
    GSI1PK: 'ORDER#ord-002', GSI1SK: 'STORE#store-001',
    GSI2PK: 'STORE#store-001', GSI2SK: '2026-02-25T10:15:00Z',
    order_id: 'ord-002',
    store_id: 'store-001',
    items: [
      { product_id: 'P024', product_name: 'Cadbury Dairy Milk 50g', quantity: 5, price: 1520, supplier: 'jumbotail' },
    ],
    total: 7600,
    status: 'draft',
    created_at: '2026-02-25T10:15:00Z',
    created_via: 'voice',
  },
];

// ─── Batch write helper ───
async function batchWrite(items: any[]) {
  // DynamoDB BatchWrite limit = 25 items
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

async function seed() {
  console.log('🌱 Seeding Swar-Vani data...\n');

  // 1. Products
  console.log('📦 Seeding 50 products...');
  const productItems = products.map(p => ({
    PK: `PRODUCT#${p.id}`,
    SK: 'META',
    GSI1PK: 'META',
    GSI1SK: `PRODUCT#${p.id}`,
    product_id: p.id,
    name_en: p.name_en,
    name_hi: p.name_hi,
    category: p.category,
    unit: p.unit,
    barcode: p.barcode,
  }));
  await batchWrite(productItems);

  // 2. Hindi aliases
  console.log('🔤 Seeding Hindi aliases...');
  const aliasItems = products.map(p => ({
    PK: `PRODUCT#${p.id}`,
    SK: 'ALIAS#hi',
    aliases: [p.name_hi, p.name_en.toLowerCase()],
  }));
  await batchWrite(aliasItems);

  // 3. Pricing
  console.log('💰 Seeding pricing (50 products × 3 suppliers = 150 records)...');
  const priceItems = products.flatMap(p => generatePricing(p.id, basePrices[p.id] || 200));
  await batchWrite(priceItems);

  // 4. Stores
  console.log('🏪 Seeding 2 demo stores...');
  await batchWrite(stores);

  // 5. Inventory
  console.log('📊 Seeding inventory (store-001: 15 items, store-002: 10 items)...');
  const inventoryItems = [
    ...store1Inventory.map(inv => ({
      PK: 'STORE#store-001',
      SK: `INV#${inv.productId}`,
      GSI1PK: `INV#${inv.productId}`,
      GSI1SK: 'STORE#store-001',
      product_id: inv.productId,
      stock: inv.stock,
      reorder_point: inv.reorder,
      low_stock: inv.stock <= inv.reorder,
      avg_daily_sales: Math.round(Math.random() * 3 * 10) / 10,
      last_restocked: '2026-02-20T10:00:00Z',
    })),
    ...store2Inventory.map(inv => ({
      PK: 'STORE#store-002',
      SK: `INV#${inv.productId}`,
      GSI1PK: `INV#${inv.productId}`,
      GSI1SK: 'STORE#store-002',
      product_id: inv.productId,
      stock: inv.stock,
      reorder_point: inv.reorder,
      low_stock: inv.stock <= inv.reorder,
      avg_daily_sales: Math.round(Math.random() * 2 * 10) / 10,
      last_restocked: '2026-02-18T10:00:00Z',
    })),
  ];
  await batchWrite(inventoryItems);

  // 6. Sample orders
  console.log('🛒 Seeding 2 sample orders...');
  await batchWrite(sampleOrders);

  console.log('\n✅ Seed complete!');
  console.log(`   50 products, 50 alias sets, 150 price records`);
  console.log(`   2 stores, 25 inventory records, 2 orders`);
}

seed().catch(console.error);
