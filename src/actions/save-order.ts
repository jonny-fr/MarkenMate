import "server-only";
import { db } from "@/db";
import { orderHistory, orderHistoryItem } from "@/db/schema";
import { revalidatePath } from "next/cache";
import { z } from "zod";

const orderItemSchema = z.object({
  menuItemId: z.number(),
  dishName: z.string(),
  type: z.string(),
  category: z.string(),
  price: z.number(),
});

const saveOrderSchema = z.object({
  restaurantId: z.number(),
  items: z.array(orderItemSchema).min(1),
});

export type OrderItem = z.infer<typeof orderItemSchema>;
export type SaveOrderInput = z.infer<typeof saveOrderSchema>;

/**
 * Save an order to the order history.
 * Creates an order history entry and associated order history items.
 */
export async function saveOrder(input: SaveOrderInput): Promise<{
  success: boolean;
  message: string;
  orderId?: number;
}> {
  try {
    // For demo purposes, use demo user ID
    // In production, get this from the authenticated session
    const userId = "demo-user-123";

    // Validate input
    const validatedData = saveOrderSchema.parse(input);

    // Calculate total price
    const totalPrice = validatedData.items.reduce(
      (sum, item) => sum + item.price,
      0,
    );

    // Create order history entry
    const [order] = await db
      .insert(orderHistory)
      .values({
        userId,
        restaurantId: validatedData.restaurantId,
        visitDate: new Date(),
        totalPrice: totalPrice.toString(),
      })
      .returning();

    // Create order history items
    await db.insert(orderHistoryItem).values(
      validatedData.items.map((item) => ({
        orderHistoryId: order.id,
        dishName: item.dishName,
        type: item.type,
        category: item.category,
        price: item.price.toString(),
      })),
    );

    // Revalidate the entire app to refresh data
    revalidatePath("/", "layout");

    return {
      success: true,
      message: "Bestellung erfolgreich gespeichert",
      orderId: order.id,
    };
  } catch (error) {
    console.error("Error saving order:", error);
    return {
      success: false,
      message: error instanceof Error ? error.message : "Fehler beim Speichern",
    };
  }
}
