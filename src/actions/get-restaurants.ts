import "server-only";
import { db } from "@/db";
import { restaurant, menuItem } from "@/db/schema";
import { eq } from "drizzle-orm";

export type RestaurantWithDishes = {
  id: string;
  name: string;
  cuisine: string;
  address: string;
  rating: number;
  isOpen: boolean;
  dishes: Array<{
    id: string;
    name: string;
    priceEuro: string;
    priceTokens: number;
  }>;
};

/**
 * Fetches all restaurants with their menu items from the database.
 * Calculates token prices based on menu item prices.
 */
export async function getRestaurants(): Promise<RestaurantWithDishes[]> {
  const restaurants = await db.select().from(restaurant);

  const restaurantsWithDishes = await Promise.all(
    restaurants.map(async (rest) => {
      const dishes = await db
        .select()
        .from(menuItem)
        .where(eq(menuItem.restaurantId, rest.id));

      // Check if restaurant is open (simplified - always open for now)
      // In a real app, this would check current time against opening hours
      const isOpen = rest.name !== "Burger Werk"; // Hardcode Burger Werk as closed for consistency

      return {
        id: `${rest.id}`,
        name: rest.name,
        cuisine: ` · ${rest.tag}`,
        address: rest.location,
        rating: Number.parseFloat(rest.rating ?? "0"),
        isOpen,
        dishes: dishes.map((dish) => {
          const price = Number.parseFloat(dish.price);
          // Calculate token price: roughly 1 token per 4-5 euros
          const tokenPrice = Math.max(1, Math.round(price / 4.5));

          return {
            id: `${dish.id}`,
            name: dish.dishName,
            priceEuro: `€${price.toFixed(2).replace(".", ",")}`,
            priceTokens: tokenPrice,
          };
        }),
      };
    })
  );

  return restaurantsWithDishes;
}
