/**
 * Proactive alerts engine — generates smart notifications based on
 * inventory state, weather, festivals, and time-based triggers.
 */

import { queryByPK, getItem } from './dynamo';
import { getWeatherForecast } from './weather';
import { getImminentFestivals } from './festival-calendar';

export async function getProactiveAlerts(storeId: string): Promise<string[]> {
  const alerts: string[] = [];

  try {
    // Fetch all inventory for this store
    const inventoryItems = await queryByPK('STORE#' + storeId, 'INV#');

    // 1. Out-of-stock alerts
    const outOfStock: string[] = [];
    const lowStockItems: string[] = [];

    for (const item of inventoryItems) {
      const stock = Number(item.stock) || 0;
      const reorderPoint = Number(item.reorder_point) || 0;
      const productId = item.product_id as string;

      // Get product name
      const meta = await getItem<Record<string, unknown>>('PRODUCT#' + productId, 'META');
      const name = (meta?.name_en as string) || productId;

      if (stock === 0) {
        outOfStock.push(name);
      } else if (stock <= reorderPoint) {
        lowStockItems.push(name);
      }
    }

    // Add out-of-stock alerts
    for (const product of outOfStock) {
      alerts.push('🔴 ' + product + ' is out of stock!');
    }

    // 2. Weather-based alerts
    try {
      const weather = await getWeatherForecast('mumbai');
      if (weather.today.tempMax > 35) {
        alerts.push('🌡️ Hot weather alert (' + weather.today.tempMax + '°C): stock up on cold drinks and ice cream');
      }
      if (weather.today.condition === 'rain') {
        alerts.push('🌧️ Rain alert: expect higher demand for chai, Maggi, and snacks');
      }
    } catch (e) {
      console.error('Weather check failed in proactive alerts:', e);
    }

    // 3. Festival alerts
    try {
      const festivals = getImminentFestivals(new Date());
      for (const fest of festivals) {
        const daysLeft = Math.ceil(
          (new Date(fest.date).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
        );
        const itemsList = fest.associatedProducts.slice(0, 4).join(', ');
        alerts.push(
          '🎉 ' + fest.name + ' (' + fest.nameHi + ') in ' + daysLeft + ' days — order ' + itemsList + ' in bulk'
        );
      }
    } catch (e) {
      console.error('Festival check failed in proactive alerts:', e);
    }

    // 4. Multiple low-stock alert
    if (lowStockItems.length > 3) {
      alerts.push('⚠️ ' + lowStockItems.length + ' items running low — generate restock order?');
    }

    // 5. Monday morning restock reminder
    const now = new Date();
    const istHour = (now.getUTCHours() + 5) % 24 + (now.getUTCMinutes() >= 30 ? 1 : 0); // rough IST
    const dayOfWeek = now.getDay(); // 0=Sun, 1=Mon
    if (dayOfWeek === 1 && istHour < 12) {
      alerts.push('📋 Weekly restock day — want me to prepare the order list?');
    }

  } catch (error) {
    console.error('Proactive alerts generation failed:', error);
  }

  return alerts;
}
