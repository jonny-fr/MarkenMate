"use server";

import "server-only";
import { db } from "@/db";
import { tokenLending } from "@/db/schema";
import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";

const updateLendingSchema = z.object({
  lendingId: z.number().int().positive("Lending ID is required"),
  tokenCount: z.number().int("Token count must be an integer"),
});

export async function updateLendingAction(formData: FormData) {
  try {
    const rawData = Object.fromEntries(formData);

    const data = updateLendingSchema.parse({
      lendingId: rawData.lendingId
        ? Number.parseInt(rawData.lendingId as string, 10)
        : undefined,
      tokenCount: rawData.tokenCount
        ? Number.parseInt(rawData.tokenCount as string, 10)
        : 0,
    });

    // Get current lending record
    const lendingRecord = await db
      .select()
      .from(tokenLending)
      .where(eq(tokenLending.id, data.lendingId));

    if (lendingRecord.length === 0) {
      return {
        success: false,
        message: "Verleihung nicht gefunden",
      };
    }

    // Calculate new total tokens lent
    const currentTokens = lendingRecord[0].tokenCount;
    const difference = data.tokenCount - currentTokens;
    const newTotalTokensLent =
      (lendingRecord[0].totalTokensLent || 0) + difference;

    // Update lending record
    await db
      .update(tokenLending)
      .set({
        tokenCount: data.tokenCount,
        totalTokensLent: newTotalTokensLent,
        lastLendingDate: new Date(),
      })
      .where(eq(tokenLending.id, data.lendingId));

    revalidatePath("/", "layout");
    return {
      success: true,
      message: "Verleihung aktualisiert",
    };
  } catch (error) {
    console.error("Error updating lending:", error);
    return {
      success: false,
      message: "Fehler beim Aktualisieren der Verleihung",
    };
  }
}
