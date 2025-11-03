"use server";

import "server-only";
import { db } from "@/db";
import { restaurant, menuItem, favorite } from "@/db/schema";
import { eq } from "drizzle-orm";
import { TokenCalculator } from "@/domain/services/token-calculator";
import { RestaurantOpeningService } from "@/domain/services/restaurant-opening-service";
import { Price } from "@/domain/value-objects/price";

export type RestaurantWithDishes = {
  id: string;
  name: string;
  cuisine: string;
  address: string;
  rating: number;
  isOpen: boolean;
  isFavorited: boolean;
  dishes: Array<{
    id: string;
    name: string;
    priceEuro: string;
    priceTokens: number;
    category: string;
    type: string;
    isFavorited: boolean;
  }>;
};

/**
 * Fetches all restaurants with their menu items from the database.
 * Calculates token prices based on menu item prices.
 * Also includes favorite status for given userId.
 */
export async function getRestaurants(
  userId?: string,
): Promise<RestaurantWithDishes[]> {
  const restaurants = await db.select().from(restaurant);

  // Fetch all favorites for this user if userId provided
  let userFavorites: {
    restaurantId: number | null;
    menuItemId: number | null;
  }[] = [];
  if (userId) {
    userFavorites = await db
      .select({
        restaurantId: favorite.restaurantId,
        menuItemId: favorite.menuItemId,
      })
      .from(favorite)
      .where(eq(favorite.userId, userId));
  }

  const favoriteRestaurantIds = new Set(
    userFavorites
      .filter((f) => f.restaurantId !== null)
      .map((f) => f.restaurantId!),
  );
  const favoriteMenuItemIds = new Set(
    userFavorites
      .filter((f) => f.menuItemId !== null)
      .map((f) => f.menuItemId!),
  );

  const restaurantsWithDishes = await Promise.all(
    restaurants.map(async (rest) => {
      const dishes = await db
        .select()
        .from(menuItem)
        .where(eq(menuItem.restaurantId, rest.id));

      const openingHours = RestaurantOpeningService.parseOpeningHours(
        rest.openingHours,
      );

      return {
        id: `${rest.id}`,
        name: rest.name,
        cuisine: ` · ${rest.tag}`,
        address: rest.location,
        rating: Number.parseFloat(rest.rating ?? "0"),
        isOpen: RestaurantOpeningService.isOpen(openingHours),
        isFavorited: favoriteRestaurantIds.has(rest.id),
        dishes: dishes.map((dish) => {
          const price = Price.create(Number.parseFloat(dish.price));
          const tokenCount = TokenCalculator.calculateTokenPrice(price);

          return {
            id: `${dish.id}`,
            name: dish.dishName,
            priceEuro: price.toEuroString(),
            priceTokens: tokenCount.value,
            category: dish.category,
            type: dish.type,
            isFavorited: favoriteMenuItemIds.has(dish.id),
          };
        }),
      };
    }),
  );

  return restaurantsWithDishes;
}
