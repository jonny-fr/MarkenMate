import "server-only";
import { db } from "@/db";
import { orderHistory, restaurant } from "@/db/schema";
import { eq, sql, and, gte } from "drizzle-orm";

export type ComparisonDataPoint = {
  date: string;
  [restaurantName: string]: string | number;
};

/**
 * Computes comparison data by restaurant from order history.
 * Groups data by date and restaurant, computing various metrics.
 */
async function getComparisonData(
  startDate: Date,
  endDate: Date,
  metric: "spending" | "frequency" | "avgPrice",
): Promise<ComparisonDataPoint[]> {
  const demoUserId = "demo-user-123";

  // Get all restaurants to use as keys
  const restaurants = await db
    .select({ id: restaurant.id, name: restaurant.name })
    .from(restaurant);

  // Create a map of restaurant IDs to string IDs for object keys
  const restaurantMap = new Map<number, string>();
  for (const rest of restaurants) {
    // Use the restaurant ID as the key (converted to string)
    restaurantMap.set(rest.id, `${rest.id}`);
  }

  if (metric === "spending") {
    // Get spending data grouped by date and restaurant
    const spendingData = await db
      .select({
        date: sql<string>`DATE(${orderHistory.visitDate})`,
        restaurantId: orderHistory.restaurantId,
        totalSpent: sql<number>`SUM(CAST(${orderHistory.totalPrice} AS NUMERIC))`,
      })
      .from(orderHistory)
      .where(
        and(
          eq(orderHistory.userId, demoUserId),
          gte(orderHistory.visitDate, startDate),
          sql`${orderHistory.visitDate} <= ${endDate}`,
        ),
      )
      .groupBy(sql`DATE(${orderHistory.visitDate})`, orderHistory.restaurantId)
      .orderBy(sql`DATE(${orderHistory.visitDate})`);

    // Transform into comparison data format
    const dateMap = new Map<string, ComparisonDataPoint>();

    for (const item of spendingData) {
      const restaurantKey = restaurantMap.get(item.restaurantId);
      if (!restaurantKey) continue;

      if (!dateMap.has(item.date)) {
        dateMap.set(item.date, { date: item.date });
      }

      const dataPoint = dateMap.get(item.date)!;
      dataPoint[restaurantKey] = Number(Number(item.totalSpent).toFixed(2));
    }

    return Array.from(dateMap.values()).sort((a, b) =>
      a.date.localeCompare(b.date),
    );
  } else if (metric === "frequency") {
    // Get visit frequency grouped by date and restaurant
    const frequencyData = await db
      .select({
        date: sql<string>`DATE(${orderHistory.visitDate})`,
        restaurantId: orderHistory.restaurantId,
        visitCount: sql<number>`COUNT(*)`,
      })
      .from(orderHistory)
      .where(
        and(
          eq(orderHistory.userId, demoUserId),
          gte(orderHistory.visitDate, startDate),
          sql`${orderHistory.visitDate} <= ${endDate}`,
        ),
      )
      .groupBy(sql`DATE(${orderHistory.visitDate})`, orderHistory.restaurantId)
      .orderBy(sql`DATE(${orderHistory.visitDate})`);

    // Transform into comparison data format
    const dateMap = new Map<string, ComparisonDataPoint>();

    for (const item of frequencyData) {
      const restaurantKey = restaurantMap.get(item.restaurantId);
      if (!restaurantKey) continue;

      if (!dateMap.has(item.date)) {
        dateMap.set(item.date, { date: item.date });
      }

      const dataPoint = dateMap.get(item.date)!;
      dataPoint[restaurantKey] = Number(item.visitCount);
    }

    return Array.from(dateMap.values()).sort((a, b) =>
      a.date.localeCompare(b.date),
    );
  } else {
    // avgPrice - average price per visit by restaurant and date
    const avgPriceData = await db
      .select({
        date: sql<string>`DATE(${orderHistory.visitDate})`,
        restaurantId: orderHistory.restaurantId,
        avgPrice: sql<number>`AVG(CAST(${orderHistory.totalPrice} AS NUMERIC))`,
      })
      .from(orderHistory)
      .where(
        and(
          eq(orderHistory.userId, demoUserId),
          gte(orderHistory.visitDate, startDate),
          sql`${orderHistory.visitDate} <= ${endDate}`,
        ),
      )
      .groupBy(sql`DATE(${orderHistory.visitDate})`, orderHistory.restaurantId)
      .orderBy(sql`DATE(${orderHistory.visitDate})`);

    // Transform into comparison data format
    const dateMap = new Map<string, ComparisonDataPoint>();

    for (const item of avgPriceData) {
      const restaurantKey = restaurantMap.get(item.restaurantId);
      if (!restaurantKey) continue;

      if (!dateMap.has(item.date)) {
        dateMap.set(item.date, { date: item.date });
      }

      const dataPoint = dateMap.get(item.date)!;
      dataPoint[restaurantKey] = Number(Number(item.avgPrice).toFixed(2));
    }

    return Array.from(dateMap.values()).sort((a, b) =>
      a.date.localeCompare(b.date),
    );
  }
}

/**
 * Get comparison data for different metrics and time periods
 */
export async function getComparisonDataSpending(): Promise<
  ComparisonDataPoint[]
> {
  const end = new Date();
  const start = new Date();
  start.setFullYear(start.getFullYear() - 1); // Last year of data
  return getComparisonData(start, end, "spending");
}

export async function getComparisonDataFrequency(): Promise<
  ComparisonDataPoint[]
> {
  const end = new Date();
  const start = new Date();
  start.setFullYear(start.getFullYear() - 1); // Last year of data
  return getComparisonData(start, end, "frequency");
}

export async function getComparisonDataAvgPrice(): Promise<
  ComparisonDataPoint[]
> {
  const end = new Date();
  const start = new Date();
  start.setFullYear(start.getFullYear() - 1); // Last year of data
  return getComparisonData(start, end, "avgPrice");
}
