"use server";

import "server-only";
import { db } from "@/db";
import { stepUpToken, user } from "@/db/schema";
import { eq, and, lt } from "drizzle-orm";
import { z } from "zod";
import { getServerSession } from "@/lib/auth-server";
import { StepUpAuthService } from "@/domain/services/step-up-auth";
import { AuditLogger } from "@/infrastructure/audit-logger";
import { correlationContext } from "@/infrastructure/correlation-context";
import { auth } from "@/lib/auth";

/**
 * Server Actions for Step-Up Authentication
 *
 * Implements re-authentication flow for sensitive operations:
 * 1. User enters password
 * 2. System validates password
 * 3. System generates step-up token (TTL 10 min)
 * 4. User can perform sensitive operation with token
 * 5. Token is invalidated after use
 */

const requestStepUpSchema = z.object({
  password: z.string().min(1, "Password is required"),
});



/**
 * Requests a step-up token by re-authenticating with password
 */
export async function requestStepUpToken(formData: FormData) {
  return correlationContext.run(async () => {
    const correlationId = correlationContext.getId();

    try {
      const session = await getServerSession();
      if (!session?.user?.id) {
        return {
          success: false,
          error: "Nicht authentifiziert",
        };
      }

      const data = requestStepUpSchema.parse({
        password: formData.get("password"),
      });

      // Get user email for password verification
      const [userDetails] = await db
        .select({ email: user.email })
        .from(user)
        .where(eq(user.id, session.user.id))
        .limit(1);

      if (!userDetails) {
        await AuditLogger.logStepUpAuth(session.user.id, false, correlationId);
        return {
          success: false,
          error: "Benutzer nicht gefunden",
        };
      }

      // SECURITY: Validate password by attempting sign-in
      // This ensures the password is actually verified before granting step-up token
      try {
        await auth.api.signInEmail({
          body: {
            email: userDetails.email,
            password: data.password,
          },
        });

        // Password is valid, generate step-up token
        const tokenData = StepUpAuthService.createToken(session.user.id);

        await db.insert(stepUpToken).values({
          token: tokenData.token,
          userId: tokenData.userId,
          expiresAt: tokenData.expiresAt,
          used: false,
        });

        await AuditLogger.logStepUpAuth(session.user.id, true, correlationId);

        return {
          success: true,
          token: tokenData.token,
        };
      } catch (_error) {
        await AuditLogger.logStepUpAuth(session.user.id, false, correlationId);

        // Don't reveal whether user exists or password is wrong (timing-safe)
        return {
          success: false,
          error: "Falsches Passwort",
        };
      }
    } catch (error) {
      console.error("[request-step-up-token] Error:", error);
      return {
        success: false,
        error: "Fehler bei der Authentifizierung",
      };
    }
  });
}

/**
 * Validates a step-up token and marks it as used
 */
export async function validateAndConsumeStepUpToken(token: string) {
  return correlationContext.run(async () => {
    try {
      const session = await getServerSession();
      if (!session?.user?.id) {
        return {
          valid: false,
          error: "Nicht authentifiziert",
        };
      }

      // Get token from database
      const [tokenRecord] = await db
        .select()
        .from(stepUpToken)
        .where(eq(stepUpToken.token, token))
        .limit(1);

      if (!tokenRecord) {
        return {
          valid: false,
          error: "Ungültiger Token",
        };
      }

      // Validate token
      const validation = StepUpAuthService.validateToken(tokenRecord);
      if (!validation.valid) {
        return {
          valid: false,
          error: validation.error,
        };
      }

      // Validate ownership
      const ownershipCheck = StepUpAuthService.validateTokenOwnership(
        tokenRecord,
        session.user.id,
      );
      if (!ownershipCheck.valid) {
        return {
          valid: false,
          error: ownershipCheck.error,
        };
      }

      // Mark token as used (one-time use)
      await db
        .update(stepUpToken)
        .set({ used: true })
        .where(and(eq(stepUpToken.token, token), eq(stepUpToken.used, false)));

      return {
        valid: true,
        userId: tokenRecord.userId,
      };
    } catch (error) {
      console.error("[validate-step-up-token] Error:", error);
      return {
        valid: false,
        error: "Fehler bei der Token-Validierung",
      };
    }
  });
}

/**
 * Cleans up expired step-up tokens (should be run periodically)
 * SECURITY: Uses parameterized query to prevent SQL injection
 */
export async function cleanupExpiredStepUpTokens() {
  try {
    const now = new Date();

    // Use lt (less than) for proper comparison, preventing SQL injection
    await db.delete(stepUpToken).where(lt(stepUpToken.expiresAt, now));

    return { success: true };
  } catch (error) {
    console.error("[cleanup-step-up-tokens] Error:", error);
    return {
      success: false,
      error: "Fehler beim Aufräumen der Tokens",
    };
  }
}
