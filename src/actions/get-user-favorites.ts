"use server";

import "server-only";
import { db } from "@/db";
import { favorite, restaurant, menuItem } from "@/db/schema";
import { eq, and } from "drizzle-orm";

export type FavoriteRestaurant = {
  id: number;
  name: string;
  location: string;
  tag: string;
  rating: string | null;
  isFavorited: true;
};

export type FavoriteMenuItem = {
  id: number;
  dishName: string;
  category: string;
  type: string;
  price: string;
  restaurantId: number;
  restaurantName: string;
  isFavorited: true;
};

export async function getUserFavorites(userId: string): Promise<{
  restaurants: FavoriteRestaurant[];
  menuItems: FavoriteMenuItem[];
}> {
  try {
    // Get favorite restaurants
    const favoriteRestaurants = await db
      .select({
        id: restaurant.id,
        name: restaurant.name,
        location: restaurant.location,
        tag: restaurant.tag,
        rating: restaurant.rating,
      })
      .from(favorite)
      .innerJoin(restaurant, eq(favorite.restaurantId, restaurant.id))
      .where(eq(favorite.userId, userId));

    // Get favorite menu items
    const favoriteMenuItems = await db
      .select({
        id: menuItem.id,
        dishName: menuItem.dishName,
        category: menuItem.category,
        type: menuItem.type,
        price: menuItem.price,
        restaurantId: menuItem.restaurantId,
        restaurantName: restaurant.name,
      })
      .from(favorite)
      .innerJoin(menuItem, eq(favorite.menuItemId, menuItem.id))
      .innerJoin(restaurant, eq(menuItem.restaurantId, restaurant.id))
      .where(eq(favorite.userId, userId));

    return {
      restaurants: favoriteRestaurants.map((r) => ({
        ...r,
        rating: r.rating?.toString() ?? null,
        isFavorited: true as const,
      })),
      menuItems: favoriteMenuItems.map((m) => ({
        ...m,
        price: m.price?.toString() ?? "0",
        isFavorited: true as const,
      })),
    };
  } catch (error) {
    console.error("Error fetching user favorites:", error);
    return {
      restaurants: [],
      menuItems: [],
    };
  }
}

export async function isFavorited(
  userId: string,
  restaurantId?: number,
  menuItemId?: number,
): Promise<boolean> {
  try {
    const conditions = [eq(favorite.userId, userId)];

    if (restaurantId) {
      conditions.push(eq(favorite.restaurantId, restaurantId));
    } else if (menuItemId) {
      conditions.push(eq(favorite.menuItemId, menuItemId));
    }

    const result = await db
      .select()
      .from(favorite)
      .where(conditions.length > 1 ? and(...conditions) : conditions[0]);

    return result.length > 0;
  } catch (error) {
    console.error("Error checking if favorited:", error);
    return false;
  }
}
