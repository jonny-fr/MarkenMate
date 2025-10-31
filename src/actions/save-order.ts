import "server-only";
import { db } from "@/db";
import { orderHistory, orderHistoryItem } from "@/db/schema";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getServerSession } from "@/lib/auth-server";

const orderItemSchema = z.object({
  menuItemId: z.number(),
  dishName: z.string(),
  type: z.string(),
  category: z.string(),
  price: z.number(),
  realPaidAmount: z.number(), // The actual amount paid with tokens
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
    // Get the authenticated user's session
    const session = await getServerSession();
    if (!session?.user?.id) {
      return {
        success: false,
        message: "Nicht authentifiziert",
      };
    }
    const userId = session.user.id;

    // Validate input
    const validatedData = saveOrderSchema.parse(input);

    // Calculate total real paid amount (not the original restaurant price)
    const totalRealPaid = validatedData.items.reduce(
      (sum, item) => sum + item.realPaidAmount,
      0,
    );

    // Create order history entry with the real paid amount
    const [order] = await db
      .insert(orderHistory)
      .values({
        userId,
        restaurantId: validatedData.restaurantId,
        visitDate: new Date(),
        totalPrice: totalRealPaid.toString(),
      })
      .returning();

    // Create order history items with real paid amounts
    await db.insert(orderHistoryItem).values(
      validatedData.items.map((item) => ({
        orderHistoryId: order.id,
        dishName: item.dishName,
        type: item.type,
        category: item.category,
        price: item.realPaidAmount.toString(), // Save the real paid amount
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
