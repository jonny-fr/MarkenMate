"use server";

import { saveOrder as saveOrderServer } from "./save-order";

export type OrderItem = {
  menuItemId: number;
  dishName: string;
  type: string;
  category: string;
  price: number;
};

export type SaveOrderInput = {
  restaurantId: number;
  items: OrderItem[];
};

/**
 * Client-safe wrapper for the save order action.
 * This can be imported in client components.
 */
export async function saveOrderAction(input: SaveOrderInput): Promise<{
  success: boolean;
  message: string;
  orderId?: number;
}> {
  return saveOrderServer(input);
}
