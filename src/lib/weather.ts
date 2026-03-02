/**
 * Weather intelligence using Open-Meteo (free, no API key).
 * Provides weather-based product recommendations for Indian cities.
 */

// City coordinates for common Indian kirana store locations
const CITY_COORDS: Record<string, { lat: number; lon: number }> = {
  'mumbai': { lat: 19.076, lon: 72.8777 },
  'delhi': { lat: 28.6139, lon: 77.2090 },
  'bangalore': { lat: 12.9716, lon: 77.5946 },
  'chennai': { lat: 13.0827, lon: 80.2707 },
  'kolkata': { lat: 22.5726, lon: 88.3639 },
  'hyderabad': { lat: 17.3850, lon: 78.4867 },
  'pune': { lat: 18.5204, lon: 73.8567 },
  'ahmedabad': { lat: 23.0225, lon: 72.5714 },
  'jaipur': { lat: 26.9124, lon: 75.7873 },
  'lucknow': { lat: 26.8467, lon: 80.9462 },
  'patna': { lat: 25.6093, lon: 85.1376 },
  'bhopal': { lat: 23.2599, lon: 77.4126 },
  'default': { lat: 19.076, lon: 72.8777 }, // Mumbai fallback
};

export interface WeatherForecast {
  date: string;
  tempMax: number;
  tempMin: number;
  precipitation: number; // mm
  precipitationProbability: number; // %
  weatherCode: number;
  condition: 'hot' | 'cold' | 'rain' | 'normal';
}

export interface WeatherInsight {
  today: WeatherForecast;
  week: WeatherForecast[];
  alerts: string[];         // Human-readable alerts in Hindi
  conditions: string[];     // Active weather conditions: 'hot', 'cold', 'rain'
  recommendedProducts: string[]; // Product IDs to stock up
}

function classifyWeather(forecast: WeatherForecast): 'hot' | 'cold' | 'rain' | 'normal' {
  if (forecast.precipitationProbability > 60 || forecast.precipitation > 5) return 'rain';
  if (forecast.tempMax > 38) return 'hot';
  if (forecast.tempMin < 12) return 'cold';
  return 'normal';
}

/**
 * Fetch 7-day weather forecast from Open-Meteo.
 */
export async function getWeatherForecast(city: string = 'mumbai'): Promise<WeatherInsight> {
  const coords = CITY_COORDS[city.toLowerCase()] || CITY_COORDS['default'];

  try {
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${coords.lat}&longitude=${coords.lon}&daily=temperature_2m_max,temperature_2m_min,precipitation_sum,precipitation_probability_max,weather_code&timezone=Asia/Kolkata&forecast_days=7`;

    const response = await fetch(url);
    if (!response.ok) throw new Error(`Weather API error: ${response.status}`);

    const data = await response.json();
    const daily = data.daily;

    const forecasts: WeatherForecast[] = daily.time.map((date: string, i: number) => {
      const f: WeatherForecast = {
        date,
        tempMax: daily.temperature_2m_max[i],
        tempMin: daily.temperature_2m_min[i],
        precipitation: daily.precipitation_sum[i] || 0,
        precipitationProbability: daily.precipitation_probability_max[i] || 0,
        weatherCode: daily.weather_code[i],
        condition: 'normal',
      };
      f.condition = classifyWeather(f);
      return f;
    });

    // Determine active conditions for the week
    const conditionSet = new Set<string>();
    for (const f of forecasts) {
      if (f.condition !== 'normal') conditionSet.add(f.condition);
    }
    const conditions = Array.from(conditionSet);

    // Generate Hindi alerts
    const alerts: string[] = [];
    const today = forecasts[0];

    if (today.condition === 'hot') {
      alerts.push(`🌡️ आज बहुत गर्मी है (${today.tempMax}°C)। ठंडे पेय और बर्फ की ज़्यादा डिमांड रहेगी।`);
    }
    if (today.condition === 'rain') {
      alerts.push(`🌧️ आज बारिश की संभावना है (${today.precipitationProbability}%)। चाय, मैगी, और नमकीन की डिमांड बढ़ेगी।`);
    }
    if (today.condition === 'cold') {
      alerts.push(`❄️ आज ठंड है (${today.tempMin}°C)। चाय-कॉफी और गरम मसाला ज़्यादा बिकेगा।`);
    }

    // Check for sustained heat/rain in the week
    const hotDays = forecasts.filter(f => f.condition === 'hot').length;
    const rainDays = forecasts.filter(f => f.condition === 'rain').length;

    if (hotDays >= 3) {
      alerts.push(`☀️ इस हफ्ते ${hotDays} दिन गर्मी रहेगी। कोल्ड ड्रिंक्स और पानी का एक्स्ट्रा स्टॉक रखें।`);
    }
    if (rainDays >= 3) {
      alerts.push(`🌧️ इस हफ्ते ${rainDays} दिन बारिश का अनुमान है। छाते और चाय-नमकीन का स्टॉक बढ़ाएं।`);
    }

    // Product recommendations based on weather
    const { getProductsForWeather } = await import('./product-master');
    const recommendedProducts = new Set<string>();
    for (const cond of conditions) {
      for (const pid of getProductsForWeather(cond)) {
        recommendedProducts.add(pid);
      }
    }

    return {
      today,
      week: forecasts,
      alerts,
      conditions,
      recommendedProducts: Array.from(recommendedProducts),
    };
  } catch (error) {
    console.error('Weather fetch failed:', error);
    // Return safe defaults
    return {
      today: { date: new Date().toISOString().split('T')[0], tempMax: 30, tempMin: 20, precipitation: 0, precipitationProbability: 0, weatherCode: 0, condition: 'normal' },
      week: [],
      alerts: [],
      conditions: [],
      recommendedProducts: [],
    };
  }
}
