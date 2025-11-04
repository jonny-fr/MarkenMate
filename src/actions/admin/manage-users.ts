"use server";

import "server-only";
import { z } from "zod";
import { getServerSession } from "@/lib/auth-server";
import { db } from "@/db";
import { user } from "@/db/schema";
import { eq, or, ilike } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { AdminGuards } from "@/domain/services/admin-guards";
import { AuditLogger } from "@/infrastructure/audit-logger";
import { correlationContext } from "@/infrastructure/correlation-context";
import { validateAndConsumeStepUpToken } from "./step-up-auth";
import { sanitizeString } from "@/lib/input-sanitization";

// Validation schema for search query
const searchQuerySchema = z.object({
  query: z
    .string()
    .min(1, "Suchbegriff muss mindestens 1 Zeichen lang sein")
    .max(100, "Suchbegriff darf maximal 100 Zeichen lang sein")
    .transform((val) =>
      sanitizeString(val, {
        maxLength: 100,
        allowSpecialChars: false,
        allowNewlines: false,
      }),
    )
    .refine(
      (val) => {
        // Prevent LIKE pattern injection
        return !val.includes("%") && !val.includes("_");
      },
      {
        message: "Ungültige Zeichen im Suchbegriff",
      },
    ),
});

// Search users with input validation and sanitization
export async function searchUsersAdmin(query: string) {
  try {
    const session = await getServerSession();

    if (!session?.user?.id) {
      return { success: false, error: "Nicht authentifiziert" };
    }

    // Verify admin role
    const [adminUser] = await db
      .select({ role: user.role })
      .from(user)
      .where(eq(user.id, session.user.id))
      .limit(1);

    if (adminUser?.role !== "admin") {
      return { success: false, error: "Keine Berechtigung" };
    }

    // SECURITY: Validate and sanitize search query to prevent SQL injection
    const validationResult = searchQuerySchema.safeParse({ query });

    if (!validationResult.success) {
      return {
        success: false,
        error: "Ungültiger Suchbegriff",
      };
    }

    const sanitizedQuery = validationResult.data.query;

    // Use parameterized query with sanitized input
    const users = await db
      .select({
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
      })
      .from(user)
      .where(
        or(
          ilike(user.name, `%${sanitizedQuery}%`),
          ilike(user.email, `%${sanitizedQuery}%`),
        ),
      )
      .limit(10);

    return { success: true, users };
  } catch (error) {
    console.error("[search-users-admin] Error:", error);
    // Don't leak internal error details to client
    return { success: false, error: "Fehler bei der Suche" };
  }
}

// Toggle admin role (requires step-up authentication)
const toggleAdminSchema = z.object({
  userId: z.string().min(1),
  stepUpToken: z.string().min(1, "Step-up authentication required"),
});

export async function toggleAdminRole(formData: FormData) {
  return correlationContext.run(async () => {
    const correlationId = correlationContext.getId();

    try {
      const session = await getServerSession();

      if (!session?.user?.id) {
        return { success: false, error: "Nicht authentifiziert" };
      }

      // Verify admin role
      const [adminUser] = await db
        .select({ role: user.role, isMasterAdmin: user.isMasterAdmin })
        .from(user)
        .where(eq(user.id, session.user.id))
        .limit(1);

      if (adminUser?.role !== "admin") {
        await AuditLogger.logAuthzFailure(
          session.user.id,
          "TOGGLE_ADMIN_ROLE",
          "User is not an admin",
          correlationId,
        );
        return { success: false, error: "Keine Berechtigung" };
      }

      const validationResult = toggleAdminSchema.safeParse({
        userId: formData.get("userId"),
        stepUpToken: formData.get("stepUpToken"),
      });

      if (!validationResult.success) {
        return { success: false, error: "Ungültige Eingabe" };
      }

      const { userId, stepUpToken: token } = validationResult.data;

      // CRITICAL: Validate step-up token (re-authentication)
      const tokenValidation = await validateAndConsumeStepUpToken(token);
      if (!tokenValidation.valid) {
        await AuditLogger.logAuthzFailure(
          session.user.id,
          "TOGGLE_ADMIN_ROLE",
          `Step-up token validation failed: ${tokenValidation.error}`,
          correlationId,
        );
        return {
          success: false,
          error: "Authentifizierung fehlgeschlagen. Bitte erneut anmelden.",
        };
      }

      // Get target user
      const [targetUser] = await db
        .select({
          id: user.id,
          role: user.role,
          isMasterAdmin: user.isMasterAdmin,
        })
        .from(user)
        .where(eq(user.id, userId))
        .limit(1);

      if (!targetUser) {
        return { success: false, error: "Benutzer nicht gefunden" };
      }

      // Get all admins for last-admin check
      const allAdmins = await db
        .select({
          id: user.id,
          role: user.role,
          isMasterAdmin: user.isMasterAdmin,
        })
        .from(user)
        .where(eq(user.role, "admin"));

      // Run all admin guards
      const guardValidation = await AdminGuards.validateRoleChange(
        session.user.id,
        targetUser,
        allAdmins,
      );

      if (!guardValidation.allowed) {
        await AuditLogger.logAuthzFailure(
          session.user.id,
          "TOGGLE_ADMIN_ROLE",
          guardValidation.reasons.join("; "),
          correlationId,
        );
        return {
          success: false,
          error: guardValidation.reasons[0] || "Rollenänderung nicht erlaubt",
        };
      }

      // Toggle role
      const oldRole = targetUser.role;
      const newRole = targetUser.role === "admin" ? "user" : "admin";

      await db.update(user).set({ role: newRole }).where(eq(user.id, userId));

      // Audit log
      await AuditLogger.logRoleChange(
        session.user.id,
        userId,
        oldRole,
        newRole,
        correlationId,
      );

      revalidatePath("/admin/users");

      return { success: true, newRole };
    } catch (error) {
      console.error("[toggle-admin-role] Error:", error);
      return { success: false, error: "Fehler beim Ändern der Rolle" };
    }
  });
}

/**
 * Gets all users with admin status (for guards)
 */
export async function getAllAdmins() {
  try {
    const session = await getServerSession();

    if (!session?.user?.id) {
      return { success: false, error: "Nicht authentifiziert" };
    }

    const [adminUser] = await db
      .select({ role: user.role })
      .from(user)
      .where(eq(user.id, session.user.id))
      .limit(1);

    if (adminUser?.role !== "admin") {
      return { success: false, error: "Keine Berechtigung" };
    }

    const admins = await db
      .select({
        id: user.id,
        name: user.name,
        email: user.email,
        isMasterAdmin: user.isMasterAdmin,
      })
      .from(user)
      .where(eq(user.role, "admin"));

    return { success: true, admins };
  } catch (error) {
    console.error("[get-all-admins] Error:", error);
    return { success: false, error: "Fehler beim Laden der Admins" };
  }
}
