/**
 * Product master data enrichment — categories, shelf life, Hindi aliases,
 * distributor types, and festival associations.
 */

// Shelf life classification: ST = Short-Term (perishable), LT = Long-Term
export type ShelfType = 'ST' | 'LT';

// Reorder cadence
export type ReorderCadence = 'daily' | 'weekly' | 'monthly';

// Distributor types for summary grouping
export type DistributorType = 'dairy' | 'dry-grocery' | 'beverage' | 'personal-care' | 'cleaning' | 'snacks' | 'frozen' | 'stationery' | 'health';

export interface ProductMasterData {
  id: string;
  shelfType: ShelfType;
  cadence: ReorderCadence;
  distributorType: DistributorType;
  hindiAliases: string[];  // lowercase romanized Hindi + colloquial names
  festivalItems?: string[];  // festivals where demand spikes: 'holi', 'diwali', 'eid', etc.
  weatherItems?: string[];   // weather triggers: 'hot', 'cold', 'rain'
}

/**
 * Master enrichment data for all 50 products.
 * hindiAliases: common Hindi/Hinglish spoken names (romanized lowercase)
 */
export const PRODUCT_MASTER: Record<string, ProductMasterData> = {
  P001: { id: 'P001', shelfType: 'LT', cadence: 'weekly', distributorType: 'snacks', hindiAliases: ['parle-g', 'parle', 'glucose biscuit', 'biscuit', 'biskut'], festivalItems: ['diwali'], weatherItems: [] },
  P002: { id: 'P002', shelfType: 'LT', cadence: 'weekly', distributorType: 'dry-grocery', hindiAliases: ['maggi', 'noodles', 'noodle', 'magi'], weatherItems: ['rain', 'cold'] },
  P003: { id: 'P003', shelfType: 'ST', cadence: 'daily', distributorType: 'dairy', hindiAliases: ['doodh', 'milk', 'amul milk', 'amul doodh', 'taaza'], weatherItems: [] },
  P004: { id: 'P004', shelfType: 'LT', cadence: 'monthly', distributorType: 'dry-grocery', hindiAliases: ['namak', 'salt', 'tata namak', 'tata salt'], weatherItems: [] },
  P005: { id: 'P005', shelfType: 'LT', cadence: 'monthly', distributorType: 'cleaning', hindiAliases: ['surf', 'surf excel', 'detergent', 'washing powder', 'kapde dhone ka'], weatherItems: [] },
  P006: { id: 'P006', shelfType: 'LT', cadence: 'monthly', distributorType: 'cleaning', hindiAliases: ['vim', 'vim bar', 'bartan dhone ka', 'dishwash'], weatherItems: [] },
  P007: { id: 'P007', shelfType: 'LT', cadence: 'weekly', distributorType: 'snacks', hindiAliases: ['good day', 'britannia good day', 'butter biscuit'], festivalItems: ['diwali'], weatherItems: [] },
  P008: { id: 'P008', shelfType: 'LT', cadence: 'monthly', distributorType: 'dry-grocery', hindiAliases: ['atta', 'aata', 'aashirvaad', 'gehun ka atta', 'flour'], festivalItems: ['holi', 'diwali'], weatherItems: [] },
  P009: { id: 'P009', shelfType: 'LT', cadence: 'monthly', distributorType: 'dry-grocery', hindiAliases: ['tel', 'oil', 'sunflower oil', 'fortune oil', 'fortune tel', 'cooking oil'], festivalItems: ['holi', 'diwali'], weatherItems: [] },
  P010: { id: 'P010', shelfType: 'LT', cadence: 'weekly', distributorType: 'beverage', hindiAliases: ['coke', 'coca cola', 'cola', 'cold drink', 'thanda', 'soft drink'], weatherItems: ['hot'] },
  P011: { id: 'P011', shelfType: 'LT', cadence: 'weekly', distributorType: 'beverage', hindiAliases: ['thums up', 'thumsup', 'thums-up', 'cold drink', 'thanda'], weatherItems: ['hot'] },
  P012: { id: 'P012', shelfType: 'LT', cadence: 'weekly', distributorType: 'snacks', hindiAliases: ['lays', 'chips', 'aloo chips', 'namkeen chips'], weatherItems: ['rain'] },
  P013: { id: 'P013', shelfType: 'LT', cadence: 'weekly', distributorType: 'snacks', hindiAliases: ['bhujia', 'haldiram', 'aloo bhujia', 'namkeen'], festivalItems: ['diwali', 'holi'], weatherItems: [] },
  P014: { id: 'P014', shelfType: 'LT', cadence: 'monthly', distributorType: 'dry-grocery', hindiAliases: ['chai', 'tea', 'chai patti', 'red label', 'brook bond'], weatherItems: ['rain', 'cold'] },
  P015: { id: 'P015', shelfType: 'LT', cadence: 'monthly', distributorType: 'dry-grocery', hindiAliases: ['coffee', 'nescafe', 'nescafé', 'instant coffee'], weatherItems: ['rain', 'cold'] },
  P016: { id: 'P016', shelfType: 'LT', cadence: 'monthly', distributorType: 'personal-care', hindiAliases: ['toothpaste', 'colgate', 'dant manjan', 'paste'], weatherItems: [] },
  P017: { id: 'P017', shelfType: 'LT', cadence: 'monthly', distributorType: 'personal-care', hindiAliases: ['dettol', 'sabun', 'soap', 'dettol soap', 'nahane ka sabun'], weatherItems: [] },
  P018: { id: 'P018', shelfType: 'LT', cadence: 'monthly', distributorType: 'personal-care', hindiAliases: ['shampoo', 'clinic plus', 'baal dhone ka'], weatherItems: [] },
  P019: { id: 'P019', shelfType: 'LT', cadence: 'monthly', distributorType: 'dry-grocery', hindiAliases: ['chawal', 'rice', 'basmati', 'india gate', 'basmati rice'], festivalItems: ['diwali', 'eid'], weatherItems: [] },
  P020: { id: 'P020', shelfType: 'LT', cadence: 'monthly', distributorType: 'dry-grocery', hindiAliases: ['dal', 'daal', 'toor dal', 'toor daal', 'arhar dal'], festivalItems: ['diwali'], weatherItems: [] },
  P021: { id: 'P021', shelfType: 'LT', cadence: 'monthly', distributorType: 'dry-grocery', hindiAliases: ['cheeni', 'sugar', 'shakkar', 'chini'], festivalItems: ['diwali', 'holi', 'eid'], weatherItems: [] },
  P022: { id: 'P022', shelfType: 'LT', cadence: 'monthly', distributorType: 'dry-grocery', hindiAliases: ['masala', 'chana masala', 'mdh', 'mdh masala'], festivalItems: ['diwali', 'holi', 'navratri'], weatherItems: [] },
  P023: { id: 'P023', shelfType: 'ST', cadence: 'weekly', distributorType: 'dairy', hindiAliases: ['butter', 'makhan', 'amul butter', 'amul makhan'], festivalItems: ['holi'], weatherItems: [] },
  P024: { id: 'P024', shelfType: 'LT', cadence: 'weekly', distributorType: 'snacks', hindiAliases: ['chocolate', 'cadbury', 'dairy milk', 'mithai'], festivalItems: ['diwali', 'rakhi'], weatherItems: [] },
  P025: { id: 'P025', shelfType: 'LT', cadence: 'weekly', distributorType: 'snacks', hindiAliases: ['kurkure', 'masala munch', 'namkeen'], weatherItems: ['rain'] },
  P026: { id: 'P026', shelfType: 'LT', cadence: 'weekly', distributorType: 'beverage', hindiAliases: ['juice', 'mango juice', 'aam ka juice', 'dabur real', 'real juice', 'frooti'], weatherItems: ['hot'] },
  P027: { id: 'P027', shelfType: 'LT', cadence: 'monthly', distributorType: 'cleaning', hindiAliases: ['harpic', 'toilet cleaner', 'bathroom cleaner'], weatherItems: [] },
  P028: { id: 'P028', shelfType: 'LT', cadence: 'monthly', distributorType: 'personal-care', hindiAliases: ['whisper', 'pad', 'sanitary pad'], weatherItems: [] },
  P029: { id: 'P029', shelfType: 'LT', cadence: 'monthly', distributorType: 'personal-care', hindiAliases: ['handwash', 'lifebuoy', 'haath dhone ka', 'hand wash'], weatherItems: [] },
  P030: { id: 'P030', shelfType: 'LT', cadence: 'monthly', distributorType: 'cleaning', hindiAliases: ['rin', 'rin bar', 'dhulai', 'kapde dhone ka sabun'], weatherItems: [] },
  P031: { id: 'P031', shelfType: 'LT', cadence: 'monthly', distributorType: 'dry-grocery', hindiAliases: ['ketchup', 'sauce', 'tomato sauce', 'tomato ketchup', 'kissan'], weatherItems: [] },
  P032: { id: 'P032', shelfType: 'LT', cadence: 'monthly', distributorType: 'dry-grocery', hindiAliases: ['garam masala', 'everest', 'everest masala'], festivalItems: ['diwali', 'holi', 'eid'], weatherItems: ['cold'] },
  P033: { id: 'P033', shelfType: 'ST', cadence: 'daily', distributorType: 'dairy', hindiAliases: ['dahi', 'curd', 'yogurt', 'mother dairy dahi'], weatherItems: ['hot'] },
  P034: { id: 'P034', shelfType: 'LT', cadence: 'weekly', distributorType: 'beverage', hindiAliases: ['paani', 'pani', 'water', 'bisleri', 'mineral water', 'bottle'], weatherItems: ['hot'] },
  P035: { id: 'P035', shelfType: 'LT', cadence: 'monthly', distributorType: 'dairy', hindiAliases: ['ghee', 'desi ghee', 'patanjali ghee'], festivalItems: ['diwali', 'holi', 'navratri'], weatherItems: [] },
  P036: { id: 'P036', shelfType: 'LT', cadence: 'monthly', distributorType: 'dry-grocery', hindiAliases: ['saffola', 'saffola oil', 'healthy oil', 'refined oil'], weatherItems: [] },
  P037: { id: 'P037', shelfType: 'LT', cadence: 'monthly', distributorType: 'personal-care', hindiAliases: ['head and shoulders', 'h&s', 'anti dandruff shampoo'], weatherItems: [] },
  P038: { id: 'P038', shelfType: 'ST', cadence: 'weekly', distributorType: 'frozen', hindiAliases: ['ice cream', 'icecream', 'amul ice cream', 'kulfi'], weatherItems: ['hot'] },
  P039: { id: 'P039', shelfType: 'ST', cadence: 'daily', distributorType: 'dairy', hindiAliases: ['bread', 'double roti', 'roti', 'britannia bread', 'pav'], weatherItems: [] },
  P040: { id: 'P040', shelfType: 'LT', cadence: 'monthly', distributorType: 'dry-grocery', hindiAliases: ['catch salt', 'sprinkler salt', 'sendha namak'], weatherItems: [] },
  P041: { id: 'P041', shelfType: 'LT', cadence: 'monthly', distributorType: 'dry-grocery', hindiAliases: ['sevaiyan', 'vermicelli', 'seviyan', 'bambino'], festivalItems: ['eid'], weatherItems: [] },
  P042: { id: 'P042', shelfType: 'LT', cadence: 'monthly', distributorType: 'stationery', hindiAliases: ['fevicol', 'glue', 'gond'], weatherItems: [] },
  P043: { id: 'P043', shelfType: 'LT', cadence: 'monthly', distributorType: 'cleaning', hindiAliases: ['good knight', 'mosquito', 'machchar', 'all out', 'coil'], weatherItems: ['rain', 'hot'] },
  P044: { id: 'P044', shelfType: 'LT', cadence: 'weekly', distributorType: 'snacks', hindiAliases: ['papad', 'lijjat', 'lijjat papad', 'appalam'], weatherItems: [] },
  P045: { id: 'P045', shelfType: 'LT', cadence: 'weekly', distributorType: 'beverage', hindiAliases: ['frooti', 'mango drink', 'aam panna'], weatherItems: ['hot'] },
  P046: { id: 'P046', shelfType: 'LT', cadence: 'monthly', distributorType: 'personal-care', hindiAliases: ['closeup', 'toothpaste', 'paste'], weatherItems: [] },
  P047: { id: 'P047', shelfType: 'LT', cadence: 'monthly', distributorType: 'personal-care', hindiAliases: ['godrej soap', 'godrej', 'sabun', 'nahane ka sabun'], weatherItems: [] },
  P048: { id: 'P048', shelfType: 'LT', cadence: 'monthly', distributorType: 'health', hindiAliases: ['glucon-d', 'glucose', 'energy drink', 'glucon d'], weatherItems: ['hot'] },
  P049: { id: 'P049', shelfType: 'LT', cadence: 'monthly', distributorType: 'dry-grocery', hindiAliases: ['sarson ka tel', 'mustard oil', 'sarson tel'], festivalItems: ['holi'], weatherItems: [] },
  P050: { id: 'P050', shelfType: 'LT', cadence: 'monthly', distributorType: 'cleaning', hindiAliases: ['nirma', 'nirma powder', 'washing powder', 'kapde dhone ka powder'], weatherItems: [] },
};

/**
 * Resolve a Hindi/Hinglish spoken name to a product ID.
 * Returns the best match or null.
 */
export function resolveProductAlias(spokenName: string): string | null {
  const query = spokenName.toLowerCase().trim();

  // Direct ID match
  if (PRODUCT_MASTER[query.toUpperCase()]) return query.toUpperCase();

  // Exact alias match
  for (const [id, data] of Object.entries(PRODUCT_MASTER)) {
    if (data.hindiAliases.includes(query)) return id;
  }

  // Partial alias match (spoken name contains alias or alias contains spoken name)
  let bestMatch: string | null = null;
  let bestScore = 0;

  for (const [id, data] of Object.entries(PRODUCT_MASTER)) {
    for (const alias of data.hindiAliases) {
      if (query.includes(alias) || alias.includes(query)) {
        const score = Math.min(query.length, alias.length) / Math.max(query.length, alias.length);
        if (score > bestScore) {
          bestScore = score;
          bestMatch = id;
        }
      }
    }
  }

  return bestScore > 0.3 ? bestMatch : null;
}

/**
 * Get products associated with a festival.
 */
export function getProductsForFestival(festival: string): string[] {
  const f = festival.toLowerCase();
  return Object.entries(PRODUCT_MASTER)
    .filter(([, data]) => data.festivalItems?.includes(f))
    .map(([id]) => id);
}

/**
 * Get products associated with a weather condition.
 */
export function getProductsForWeather(weather: string): string[] {
  const w = weather.toLowerCase();
  return Object.entries(PRODUCT_MASTER)
    .filter(([, data]) => data.weatherItems?.includes(w))
    .map(([id]) => id);
}

/**
 * Distributor type display names (for summary grouping).
 */
export const DISTRIBUTOR_LABELS: Record<DistributorType, string> = {
  'dairy': '🥛 Dairy (दूध/डेयरी)',
  'dry-grocery': '🛒 Dry Grocery (किराना)',
  'beverage': '🥤 Beverages (पेय पदार्थ)',
  'personal-care': '🧴 Personal Care',
  'cleaning': '🧹 Cleaning (सफाई)',
  'snacks': '🍿 Snacks (नमकीन/बिस्कुट)',
  'frozen': '🧊 Frozen',
  'stationery': '📎 Stationery',
  'health': '💊 Health Drinks',
};
