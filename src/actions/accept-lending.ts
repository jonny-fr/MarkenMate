"use server";

import "server-only";
import { db } from "@/db";
import { tokenLending } from "@/db/schema";
import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";

const acceptLendingSchema = z.object({
  lendingId: z.number().int().positive("Lending ID is required"),
  status: z.enum(["accepted", "declined"]),
});

export async function acceptLendingAction(formData: FormData) {
  try {
    const rawData = Object.fromEntries(formData);

    const data = acceptLendingSchema.parse({
      lendingId: rawData.lendingId
        ? Number.parseInt(rawData.lendingId as string)
        : undefined,
      status: rawData.status,
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

    // Update status
    await db
      .update(tokenLending)
      .set({
        acceptanceStatus: data.status,
      })
      .where(eq(tokenLending.id, data.lendingId));

    revalidatePath("/", "layout");
    return {
      success: true,
      message:
        data.status === "accepted"
          ? "Verleihung akzeptiert"
          : "Verleihung abgelehnt",
    };
  } catch (error) {
    console.error("Error accepting lending:", error);
    return {
      success: false,
      message: "Fehler beim Aktualisieren der Verleihung",
    };
  }
}
