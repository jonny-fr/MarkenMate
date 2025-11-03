"use server";

import "server-only";
import { db } from "@/db";
import { tokenLending } from "@/db/schema";
import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getContainer } from "@/infrastructure/container";
import { getServerSession } from "@/lib/auth-server";
import { TokenCount } from "@/domain/value-objects/token-count";

const updateLendingSchema = z.object({
  lendingId: z.number().int().positive("Lending ID is required"),
  tokenCount: z.number().int("Token count must be an integer"),
});

export async function updateLendingAction(formData: FormData) {
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

    const data = updateLendingSchema.parse({
      lendingId: rawData.lendingId
        ? Number.parseInt(rawData.lendingId as string, 10)
        : undefined,
      tokenCount: rawData.tokenCount
        ? Number.parseInt(rawData.tokenCount as string, 10)
        : 0,
    });

    // Get current lending record
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

    // Security check: Verify user owns this lending record
    await authorizationService.requireOwnership(userId, lendingRecord.userId);

    // Use domain value objects for business logic
    const currentTokens = TokenCount.create(lendingRecord.tokenCount);
    const newTokens = TokenCount.create(data.tokenCount);
    const difference = newTokens.subtract(currentTokens);
    const totalTokensLent = TokenCount.create(
      lendingRecord.totalTokensLent || 0,
    );
    const newTotalTokensLent = totalTokensLent.add(difference);

    // Update lending record
    await db
      .update(tokenLending)
      .set({
        tokenCount: newTokens.value,
        totalTokensLent: newTotalTokensLent.value,
        lastLendingDate: new Date(),
      })
      .where(eq(tokenLending.id, data.lendingId));

    // Audit log the update
    await logger.audit(
      "UPDATE_LENDING",
      {
        lendingId: data.lendingId,
        personName: lendingRecord.personName,
        oldTokenCount: currentTokens.value,
        newTokenCount: newTokens.value,
        difference: difference.value,
      },
      userId,
    );

    revalidatePath("/", "layout");
    return {
      success: true,
      message: "Verleihung aktualisiert",
    };
  } catch (error) {
    console.error("Error updating lending:", error);

    // Don't expose internal errors to client
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
