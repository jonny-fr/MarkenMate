"use server";

import "server-only";
import { db } from "@/db";
import { favorite } from "@/db/schema";
import { eq, and, isNull } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";

const toggleFavoriteSchema = z.object({
  userId: z.string().min(1, "User ID is required"),
  restaurantId: z.number().int().positive().optional(),
  menuItemId: z.number().int().positive().optional(),
});

export async function toggleFavoriteAction(formData: FormData) {
  try {
    const rawData = Object.fromEntries(formData);

    // Parse and validate
    const data = toggleFavoriteSchema.parse({
      userId: rawData.userId,
      restaurantId: rawData.restaurantId
        ? Number.parseInt(rawData.restaurantId as string)
        : undefined,
      menuItemId: rawData.menuItemId
        ? Number.parseInt(rawData.menuItemId as string)
        : undefined,
    });

    // Ensure at least one of restaurantId or menuItemId is provided
    if (!data.restaurantId && !data.menuItemId) {
      return {
        success: false,
        message: "Either restaurantId or menuItemId must be provided",
      };
    }

    // Build WHERE condition dynamically
    const whereConditions = [eq(favorite.userId, data.userId)];

    if (data.restaurantId) {
      whereConditions.push(eq(favorite.restaurantId, data.restaurantId));
      whereConditions.push(isNull(favorite.menuItemId));
    } else if (data.menuItemId) {
      whereConditions.push(eq(favorite.menuItemId, data.menuItemId));
      whereConditions.push(isNull(favorite.restaurantId));
    }

    // Check if favorite already exists
    const existingFavorite = await db
      .select()
      .from(favorite)
      .where(and(...whereConditions));

    if (existingFavorite.length > 0) {
      // Remove favorite
      await db.delete(favorite).where(and(...whereConditions));

      revalidatePath("/", "layout");
      return {
        success: true,
        message: "Favorite removed",
        isFavorited: false,
      };
    } else {
      // Add favorite
      await db.insert(favorite).values({
        userId: data.userId,
        restaurantId: data.restaurantId || null,
        menuItemId: data.menuItemId || null,
      });

      revalidatePath("/", "layout");
      return {
        success: true,
        message: "Favorite added",
        isFavorited: true,
      };
    }
  } catch (error) {
    console.error("Error toggling favorite:", error);
    return {
      success: false,
      message: "Failed to toggle favorite",
    };
  }
}
