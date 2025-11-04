"use server";

import "server-only";
import { db } from "@/db";
import { tokenLending } from "@/db/schema";
import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getContainer } from "@/infrastructure/container";
import { getServerSession } from "@/lib/auth-server";

const acceptLendingSchema = z.object({
  lendingId: z.number().int().positive("Lending ID is required"),
  status: z.enum(["accepted", "declined"]),
});

export async function acceptLendingAction(formData: FormData) {
  const { logger } = getContainer();

  try {
    // Get authenticated user
    const session = await getServerSession();
    if (!session?.user?.id) {
      return {
        success: false,
        message: "Nicht authentifiziert",
      };
    }
    const currentUserId = session.user.id;

    const rawData = Object.fromEntries(formData);

    const data = acceptLendingSchema.parse({
      lendingId: rawData.lendingId
        ? Number.parseInt(rawData.lendingId as string, 10)
        : undefined,
      status: rawData.status,
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

    // Security check: Only the borrower (lendToUserId) can accept/decline
    // If lendToUserId is null, this is a legacy record without proper linkage
    if (
      lendingRecord.lendToUserId &&
      lendingRecord.lendToUserId !== currentUserId
    ) {
      return {
        success: false,
        message:
          "Keine Berechtigung - Sie können nur Ihre eigenen Verleihungsanfragen annehmen",
      };
    }

    // Update status
    await db
      .update(tokenLending)
      .set({
        acceptanceStatus: data.status,
      })
      .where(eq(tokenLending.id, data.lendingId));

    // Audit log the acceptance/decline
    await logger.audit(
      data.status === "accepted" ? "ACCEPT_LENDING" : "DECLINE_LENDING",
      {
        lendingId: data.lendingId,
        lenderUserId: lendingRecord.userId,
        borrowerUserId: currentUserId,
        tokenCount: lendingRecord.tokenCount,
      },
      currentUserId,
    );

    // Aggressive cache invalidation for immediate UI updates
    // This ensures the data is immediately refreshed on the client
    revalidatePath("/", "layout"); // Revalidate entire app
    revalidatePath("/dashboard"); // Revalidate dashboard page
    revalidatePath("/dashboard", "page"); // Revalidate dashboard page specifically

    return {
      success: true,
      message:
        data.status === "accepted"
          ? "Verleihung akzeptiert"
          : "Verleihung abgelehnt",
    };
  } catch (error) {
    console.error("Error accepting lending:", error);

    // Prevent exposure of internal errors to client
    const message =
      error instanceof Error && error.name === "ForbiddenError"
        ? "Keine Berechtigung"
        : "Fehler beim Aktualisieren der Verleihung";

    return {
      success: false,
      message,
    };
  }
}
