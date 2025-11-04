"use server";

import "server-only";
import { db } from "@/db";
import { tokenLending } from "@/db/schema";
import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getContainer } from "@/infrastructure/container";
import { getServerSession } from "@/lib/auth-server";

const deleteLendingSchema = z.object({
  lendingId: z.number().int().positive("Lending ID is required"),
});

export async function deleteLendingAction(formData: FormData) {
  const { authorizationService, logger } = getContainer();

  try {
    // Get authenticated user
    const session = await getServerSession();
    if (!session?.user?.id) {
      return {
        success: false,
        message: "Nicht authentifiziert",
      };
    }
    const userId = session.user.id;

    const rawData = Object.fromEntries(formData);

    const data = deleteLendingSchema.parse({
      lendingId: rawData.lendingId
        ? Number.parseInt(rawData.lendingId as string, 10)
        : undefined,
    });

    // Check if lending record exists
    const [lendingRecord] = await db
      .select()
      .from(tokenLending)
      .where(eq(tokenLending.id, data.lendingId));

    if (!lendingRecord) {
      return {
        success: false,
        message: "Verleihung nicht gefunden",
      };
    }

    // Security check: Only the LENDER (who created the record) can delete it
    // The borrower (lendToUserId) cannot delete the lending record
    if (lendingRecord.userId !== userId) {
      await logger.audit(
        "DELETE_LENDING_UNAUTHORIZED",
        {
          lendingId: data.lendingId,
          attemptedByUserId: userId,
          actualOwnerId: lendingRecord.userId,
        },
        userId,
      );
      return {
        success: false,
        message: "Keine Berechtigung - Nur der Verleiher kann diese Verleihung löschen",
      };
    }

    // Delete lending record
    await db.delete(tokenLending).where(eq(tokenLending.id, data.lendingId));

    // Audit log the deletion
    await logger.audit(
      "DELETE_LENDING",
      {
        lendingId: data.lendingId,
        personName: lendingRecord.personName,
        tokenCount: lendingRecord.tokenCount,
      },
      userId,
    );

    // Aggressive cache invalidation for immediate UI updates
    // This ensures the data is immediately refreshed on the client
    revalidatePath("/", "layout"); // Revalidate entire app
    revalidatePath("/dashboard"); // Revalidate dashboard page
    revalidatePath("/dashboard", "page"); // Revalidate dashboard page specifically
    
    return {
      success: true,
      message: "Verleihung gelöscht",
    };
  } catch (error) {
    console.error("Error deleting lending:", error);

    // Don't expose internal errors to client
    const message =
      error instanceof Error && error.name === "ForbiddenError"
        ? "Keine Berechtigung"
        : "Fehler beim Löschen der Verleihung";

    return {
      success: false,
      message,
    };
  }
}
