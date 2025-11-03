"use server";

import "server-only";
import { db } from "@/db";
import { tokenLending } from "@/db/schema";
import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";

const deleteLendingSchema = z.object({
  lendingId: z.number().int().positive("Lending ID is required"),
});

export async function deleteLendingAction(formData: FormData) {
  try {
    const rawData = Object.fromEntries(formData);

    const data = deleteLendingSchema.parse({
      lendingId: rawData.lendingId
        ? Number.parseInt(rawData.lendingId as string, 10)
        : undefined,
    });

    // Check if lending record exists
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

    // Delete lending record
    await db.delete(tokenLending).where(eq(tokenLending.id, data.lendingId));

    revalidatePath("/", "layout");
    return {
      success: true,
      message: "Verleihung gelöscht",
    };
  } catch (error) {
    console.error("Error deleting lending:", error);
    return {
      success: false,
      message: "Fehler beim Löschen der Verleihung",
    };
  }
}
