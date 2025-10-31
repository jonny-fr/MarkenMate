import "server-only";
import { db } from "@/db";
import { orderHistory, orderHistoryItem, restaurant } from "@/db/schema";
import { eq } from "drizzle-orm";
import { getServerSession } from "@/lib/auth-server";

export type HistoryItem = {
  id: string;
  date: string;
  restaurant: string;
  totalPrice: number;
  items: Array<{
    id: string;
    name: string;
    price: number;
    quantity: number;
  }>;
};

/**
 * Fetches order history data for the authenticated user.
 */
export async function getHistoryData(): Promise<HistoryItem[]> {
  // Get the authenticated user's session
  const session = await getServerSession();
  if (!session?.user?.id) {
    // Return empty array if user is not authenticated
    return [];
  }
  const userId = session.user.id;

  const orders = await db
    .select({
      id: orderHistory.id,
      visitDate: orderHistory.visitDate,
      totalPrice: orderHistory.totalPrice,
      restaurantId: orderHistory.restaurantId,
      restaurantName: restaurant.name,
    })
    .from(orderHistory)
    .leftJoin(restaurant, eq(orderHistory.restaurantId, restaurant.id))
    .where(eq(orderHistory.userId, userId))
    .orderBy(orderHistory.visitDate);

  const historyItems = await Promise.all(
    orders.map(async (order) => {
      const items = await db
        .select()
        .from(orderHistoryItem)
        .where(eq(orderHistoryItem.orderHistoryId, order.id));

      // Group items by dish name and count quantities
      const itemMap = new Map<
        string,
        { name: string; price: number; quantity: number }
      >();

      for (const item of items) {
        const key = `${item.dishName}-${item.price}`;
        const existing = itemMap.get(key);
        if (existing) {
          existing.quantity += 1;
        } else {
          itemMap.set(key, {
            name: item.dishName,
            price: Number.parseFloat(item.price),
            quantity: 1,
          });
        }
      }

      return {
        id: `h${order.id}`,
        date: order.visitDate.toISOString().split("T")[0],
        restaurant: order.restaurantName ?? "Unknown",
        totalPrice: Number.parseFloat(order.totalPrice),
        items: Array.from(itemMap.values()).map((item, idx) => ({
          id: `i${order.id}-${idx}`,
          ...item,
        })),
      };
    }),
  );

  // Sort by date descending (most recent first)
  return historyItems.sort((a, b) => b.date.localeCompare(a.date));
}
