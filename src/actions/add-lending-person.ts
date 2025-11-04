"use server";

import "server-only";
import { db } from "@/db";
import { tokenLending } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { LendingStateMachine } from "@/domain/services/lending-state-machine";
import { AuditLogger } from "@/infrastructure/audit-logger";
import { correlationContext } from "@/infrastructure/correlation-context";
import { getServerSession } from "@/lib/auth-server";

const addLendingPersonSchema = z.object({
  userId: z.string().min(1, "User ID is required"),
  lendToUserId: z.string().min(1, "Lend to user ID is required"),
  personName: z.string().min(1, "Person name is required"),
  tokenCount: z.number().int().positive("Token count must be positive"),
});

export async function addLendingPersonAction(formData: FormData) {
  return correlationContext.run(async () => {
    const correlationId = correlationContext.getId();

    try {
      // Get authenticated user for audit logging
      const session = await getServerSession();
      if (!session?.user?.id) {
        return {
          success: false,
          message: "Nicht authentifiziert",
        };
      }

      const rawData = Object.fromEntries(formData);

      const data = addLendingPersonSchema.parse({
        userId: rawData.userId,
        lendToUserId: rawData.lendToUserId,
        personName: rawData.personName,
        tokenCount: rawData.tokenCount
          ? Number.parseInt(rawData.tokenCount as string, 10)
          : 0,
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

      // Verify user is creating their own lending
      if (data.userId !== session.user.id) {
        await AuditLogger.logAuthzFailure(
          session.user.id,
          "CREATE_LENDING",
          "Attempted to create lending for another user",
          correlationId,
        );
        return {
          success: false,
          message: "Sie können nur Ihre eigenen Verleihungen erstellen",
        };
      }

      // Check for duplicate lending relationships
      const existingLendings = await db
        .select({
          userId: tokenLending.userId,
          lendToUserId: tokenLending.lendToUserId,
        })
        .from(tokenLending)
        .where(eq(tokenLending.userId, data.userId));

      const duplicateCheck = LendingStateMachine.validateNoDuplicate(
        existingLendings,
        data.userId,
        data.lendToUserId,
      );

      if (!duplicateCheck.valid) {
        return {
          success: false,
          message: duplicateCheck.error,
        };
      }

      // Add new lending record
      const [newLending] = await db
        .insert(tokenLending)
        .values({
          userId: data.userId,
          lendToUserId: data.lendToUserId,
          personName: data.personName,
          tokenCount: data.tokenCount,
          totalTokensLent: data.tokenCount,
          acceptanceStatus: "pending",
          version: 1,
        })
        .returning({ id: tokenLending.id });

      // Audit log
      await AuditLogger.logLendingOperation(
        data.userId,
        "CREATE",
        newLending?.id || 0,
        {
          lendToUserId: data.lendToUserId,
          personName: data.personName,
          tokenCount: data.tokenCount,
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
        message: "Person hinzugefügt",
      };
    } catch (error) {
      console.error("Error adding lending person:", error);
      return {
        success: false,
        message: "Fehler beim Hinzufügen der Person",
      };
    }
  });
}
