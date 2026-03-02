/**
 * Indian Festival Calendar — upcoming festivals with associated product demand.
 * All dates are for 2026. In production, pull from an API or maintain a multi-year table.
 */

export interface FestivalInfo {
  name: string;
  nameHi: string;
  date: string; // YYYY-MM-DD
  region: 'national' | 'north' | 'south' | 'west' | 'east';
  associatedProducts: string[]; // Product category keywords
  productIds: string[];        // Specific product IDs that spike
  prepDays: 7 | 14 | 21;      // Days before the festival to start alerting
}

export const FESTIVAL_CALENDAR_2026: FestivalInfo[] = [
  {
    name: 'Holi',
    nameHi: 'होली',
    date: '2026-03-14',
    region: 'national',
    associatedProducts: ['colors', 'oil', 'flour', 'sweets', 'ghee', 'snacks', 'cold drinks'],
    productIds: ['P008', 'P009', 'P013', 'P021', 'P035', 'P049', 'P010', 'P011', 'P023', 'P032', 'P022'],
    prepDays: 14,
  },
  {
    name: 'Eid ul-Fitr',
    nameHi: 'ईद उल-फ़ित्र',
    date: '2026-03-21',
    region: 'national',
    associatedProducts: ['vermicelli', 'sugar', 'ghee', 'rice', 'masala', 'sweets'],
    productIds: ['P041', 'P021', 'P035', 'P019', 'P032', 'P022'],
    prepDays: 14,
  },
  {
    name: 'Navratri',
    nameHi: 'नवरात्रि',
    date: '2026-10-11',
    region: 'national',
    associatedProducts: ['fasting items', 'ghee', 'masala', 'fruits', 'milk'],
    productIds: ['P035', 'P022', 'P032', 'P003'],
    prepDays: 14,
  },
  {
    name: 'Dussehra',
    nameHi: 'दशहरा',
    date: '2026-10-20',
    region: 'national',
    associatedProducts: ['sweets', 'snacks', 'ghee'],
    productIds: ['P024', 'P013', 'P035'],
    prepDays: 7,
  },
  {
    name: 'Diwali',
    nameHi: 'दिवाली',
    date: '2026-11-08',
    region: 'national',
    associatedProducts: ['sweets', 'snacks', 'oil', 'ghee', 'dry fruits', 'chocolate', 'biscuits', 'sugar', 'flour', 'rice'],
    productIds: ['P001', 'P007', 'P008', 'P009', 'P013', 'P019', 'P020', 'P021', 'P024', 'P035', 'P022', 'P032'],
    prepDays: 21,
  },
  {
    name: 'Raksha Bandhan',
    nameHi: 'रक्षा बंधन',
    date: '2026-08-11',
    region: 'national',
    associatedProducts: ['sweets', 'chocolate', 'gifts'],
    productIds: ['P024'],
    prepDays: 7,
  },
  {
    name: 'Chhath Puja',
    nameHi: 'छठ पूजा',
    date: '2026-11-10',
    region: 'east',
    associatedProducts: ['fruits', 'sugar', 'flour', 'ghee'],
    productIds: ['P008', 'P021', 'P035'],
    prepDays: 7,
  },
  {
    name: 'Makar Sankranti',
    nameHi: 'मकर संक्रांति',
    date: '2026-01-14',
    region: 'national',
    associatedProducts: ['til', 'gur', 'ghee'],
    productIds: ['P021', 'P035'],
    prepDays: 7,
  },
  {
    name: 'Ganesh Chaturthi',
    nameHi: 'गणेश चतुर्थी',
    date: '2026-08-22',
    region: 'west',
    associatedProducts: ['sweets', 'modak ingredients', 'flour', 'ghee', 'sugar'],
    productIds: ['P008', 'P021', 'P035', 'P024'],
    prepDays: 14,
  },
  {
    name: 'Onam',
    nameHi: 'ओणम',
    date: '2026-09-07',
    region: 'south',
    associatedProducts: ['rice', 'oil', 'masala', 'vegetables'],
    productIds: ['P019', 'P009', 'P022', 'P032'],
    prepDays: 7,
  },
  {
    name: 'Christmas',
    nameHi: 'क्रिसमस',
    date: '2026-12-25',
    region: 'national',
    associatedProducts: ['cake ingredients', 'chocolate', 'cold drinks', 'snacks'],
    productIds: ['P024', 'P010', 'P011', 'P012'],
    prepDays: 14,
  },
];

/**
 * Get upcoming festivals within the next N days from a given date.
 */
export function getUpcomingFestivals(fromDate: Date, withinDays: number = 14): FestivalInfo[] {
  const results: FestivalInfo[] = [];

  for (const fest of FESTIVAL_CALENDAR_2026) {
    const festDate = new Date(fest.date);
    const diffMs = festDate.getTime() - fromDate.getTime();
    const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

    // Show if festival is within the alert window (prepDays before the date)
    if (diffDays > 0 && diffDays <= fest.prepDays) {
      results.push(fest);
    }
  }

  return results.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
}

/**
 * Check if any festival is happening within 7 days (for proactive alerts).
 */
export function getImminentFestivals(fromDate: Date): FestivalInfo[] {
  return getUpcomingFestivals(fromDate, 7);
}
