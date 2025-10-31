import "server-only";
import { db } from "@/db";
import { restaurant, menuItem } from "@/db/schema";
import { eq } from "drizzle-orm";

/**
 * Conversion rate for calculating token prices from euro prices.
 * 1 token ≈ €4.50 (configurable for business logic changes)
 */
const EURO_PER_TOKEN = 4.5;

/**
 * Check if a restaurant is currently open based on opening hours.
 * @param openingHoursJson - JSON string of opening hours
 * @returns true if restaurant is open, false otherwise
 */
function isRestaurantOpen(openingHoursJson: string | null): boolean {
  if (!openingHoursJson) return false;

  try {
    const hours = JSON.parse(openingHoursJson);
    const now = new Date();
    const dayNames = [
      "sunday",
      "monday",
      "tuesday",
      "wednesday",
      "thursday",
      "friday",
      "saturday",
    ];
    const todayHours = hours[dayNames[now.getDay()]];

    // If closed or no hours defined
    if (!todayHours || todayHours === "closed") return false;

    // For demo purposes, return true if there are hours defined
    // In production, you'd parse the time range and check against current time
    return true;
  } catch {
    // If parsing fails, default to closed
    return false;
  }
}

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
    category: string;
    type: string;
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

      return {
        id: `${rest.id}`,
        name: rest.name,
        cuisine: ` · ${rest.tag}`,
        address: rest.location,
        rating: Number.parseFloat(rest.rating ?? "0"),
        isOpen: isRestaurantOpen(rest.openingHours),
        dishes: dishes.map((dish) => {
          const price = Number.parseFloat(dish.price);
          const tokenPrice = Math.max(1, Math.round(price / EURO_PER_TOKEN));

          return {
            id: `${dish.id}`,
            name: dish.dishName,
            priceEuro: `€${price.toFixed(2).replace(".", ",")}`,
            priceTokens: tokenPrice,
            category: dish.category,
            type: dish.type,
          };
        }),
      };
    }),
  );

  return restaurantsWithDishes;
}
