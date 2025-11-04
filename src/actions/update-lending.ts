"use server";

import "server-only";
import { db } from "@/db";
import { tokenLending } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getContainer } from "@/infrastructure/container";
import { getServerSession } from "@/lib/auth-server";
import { LendingStateMachine } from "@/domain/services/lending-state-machine";
import { AuditLogger } from "@/infrastructure/audit-logger";
import { correlationContext } from "@/infrastructure/correlation-context";

const updateLendingSchema = z.object({
  lendingId: z.number().int().positive("Lending ID is required"),
  tokenCount: z.number().int("Token count must be an integer"),
  version: z
    .number()
    .int()
    .positive("Version is required for concurrency control"),
});

export async function updateLendingAction(formData: FormData) {
  const { authorizationService } = getContainer();

  return correlationContext.run(async () => {
    const correlationId = correlationContext.getId();

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
        version: rawData.version
          ? Number.parseInt(rawData.version as string, 10)
          : 1,
      });

      // Validate token count
      const tokenValidation = LendingStateMachine.validateTokenCount(
        data.tokenCount,
      );
      if (!tokenValidation.valid) {
        return {
          success: false,
          message: tokenValidation.error,
        };
      }

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

      // Validate concurrency (optimistic locking)
      const versionCheck = LendingStateMachine.validateVersion(
        lendingRecord.version,
        data.version,
      );
      if (!versionCheck.valid) {
        return {
          success: false,
          message: versionCheck.error,
        };
      }

      // Validate ownership
      const ownershipCheck = LendingStateMachine.validateOwnership(
        lendingRecord,
        userId,
      );
      if (!ownershipCheck.valid) {
        await AuditLogger.logAuthzFailure(
          userId,
          "UPDATE_LENDING",
          ownershipCheck.error || "Ownership check failed",
          correlationId,
        );
        return {
          success: false,
          message: ownershipCheck.error,
        };
      }

      // Validate state allows update
      const updateCheck = LendingStateMachine.canUpdate(lendingRecord);
      if (!updateCheck.allowed) {
        return {
          success: false,
          message: updateCheck.reason,
        };
      }

      // Calculate new total
      const newTotalTokensLent = LendingStateMachine.calculateNewTotal(
        lendingRecord.totalTokensLent || 0,
        lendingRecord.tokenCount,
        data.tokenCount,
      );

      // Update lending record with version increment
      await db
        .update(tokenLending)
        .set({
          tokenCount: data.tokenCount,
          totalTokensLent: newTotalTokensLent,
          lastLendingDate: new Date(),
          version: lendingRecord.version + 1,
        })
        .where(
          and(
            eq(tokenLending.id, data.lendingId),
            eq(tokenLending.version, data.version), // Optimistic lock check
          ),
        );

      // Audit log the update
      await AuditLogger.logLendingOperation(
        userId,
        "UPDATE",
        data.lendingId,
        {
          personName: lendingRecord.personName,
          oldTokenCount: lendingRecord.tokenCount,
          newTokenCount: data.tokenCount,
          difference: data.tokenCount - lendingRecord.tokenCount,
          newTotalTokensLent,
        },
        correlationId,
      );

      // Aggressive cache invalidation for immediate UI updates
      // This ensures the data is immediately refreshed on the client
      revalidatePath("/", "layout"); // Revalidate entire app
      revalidatePath("/dashboard"); // Revalidate dashboard page
      revalidatePath("/dashboard", "page"); // Revalidate dashboard page specifically

      return {
        success: true,
        message: "Verleihung aktualisiert",
      };
    } catch (error) {
      console.error("Error updating lending:", error);

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
  });
}
