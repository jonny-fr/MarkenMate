"use server";

import "server-only";
import { db } from "@/db";
import { tokenLending } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";

const addLendingPersonSchema = z.object({
  userId: z.string().min(1, "User ID is required"),
  lendToUserId: z.string().min(1, "Lend to user ID is required"),
  personName: z.string().min(1, "Person name is required"),
  tokenCount: z.number().int().nonnegative("Token count must be non-negative"),
});

export async function addLendingPersonAction(formData: FormData) {
  try {
    const rawData = Object.fromEntries(formData);

    const data = addLendingPersonSchema.parse({
      userId: rawData.userId,
      lendToUserId: rawData.lendToUserId,
      personName: rawData.personName,
      tokenCount: rawData.tokenCount
        ? Number.parseInt(rawData.tokenCount as string)
        : 0,
    });

    // Check if lending relationship already exists between these two users
    const existingLending = await db
      .select()
      .from(tokenLending)
      .where(
        and(
          eq(tokenLending.userId, data.userId),
          eq(tokenLending.lendToUserId, data.lendToUserId),
        ),
      );

    if (existingLending.length > 0) {
      return {
        success: false,
        message: "Verleihbeziehung mit dieser Person existiert bereits",
      };
    }

    // Add new lending record
    await db.insert(tokenLending).values({
      userId: data.userId,
      lendToUserId: data.lendToUserId,
      personName: data.personName,
      tokenCount: data.tokenCount,
      totalTokensLent: data.tokenCount,
      acceptanceStatus: "pending",
    });

    revalidatePath("/", "layout");
    return {
      success: true,
      message: "Person hinzugefügt",
    };
  } catch (error) {
    console.error("Error adding lending person:", error);
    return {
      success: false,
      message: "Fehler beim Hinzufügen der Person",
    };
  }
}
