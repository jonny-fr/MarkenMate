"use server";

import { z } from "zod";
import { getServerSession } from "@/lib/auth-server";
import { db } from "@/db";
import { user, account } from "@/db/schema";
import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";

const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, "Aktuelles Passwort erforderlich"),
  newPassword: z.string().min(8, "Neues Passwort muss mindestens 8 Zeichen lang sein"),
});

export async function changePasswordAction(formData: FormData) {
  try {
    const session = await getServerSession();

    if (!session?.user?.id) {
      console.error("[change-password] No session");
      return { success: false, error: "Nicht authentifiziert" };
    }

    // Validate input
    const validationResult = changePasswordSchema.safeParse({
      currentPassword: formData.get("currentPassword"),
      newPassword: formData.get("newPassword"),
    });

    if (!validationResult.success) {
      console.error("[change-password] Validation failed:", validationResult.error);
      return {
        success: false,
        error: validationResult.error.issues[0]?.message || "Ungültige Eingabe",
      };
    }

    const { currentPassword, newPassword } = validationResult.data;

    console.log("[change-password] Starting password change for user:", session.user.id);

    // Get user email for better-auth
    const [userDetails] = await db
      .select({ email: user.email })
      .from(user)
      .where(eq(user.id, session.user.id))
      .limit(1);

    if (!userDetails) {
      console.error("[change-password] User not found");
      return { success: false, error: "Benutzer nicht gefunden" };
    }

    console.log("[change-password] User email:", userDetails.email);

    // Verify current password by trying to sign in
    try {
      await auth.api.signInEmail({
        body: {
          email: userDetails.email,
          password: currentPassword,
        },
      });
      console.log("[change-password] Current password verified");
    } catch (error) {
      console.error("[change-password] Current password verification failed:", error);
      return { success: false, error: "Aktuelles Passwort ist falsch" };
    }

    // Create a temporary user with the new password to get proper hash
    console.log("[change-password] Creating temporary user to hash new password");
    const tempEmail = `temp-${Date.now()}@temp.temp`;
    
    try {
      const tempUser = await auth.api.signUpEmail({
        body: {
          email: tempEmail,
          password: newPassword,
          name: "Temp",
        },
      });

      console.log("[change-password] Temp user created:", tempUser.user.id);

      // Get the hashed password
      const [tempAccount] = await db
        .select({ password: account.password })
        .from(account)
        .where(eq(account.userId, tempUser.user.id))
        .limit(1);

      if (!tempAccount?.password) {
        throw new Error("Could not get password hash");
      }

      console.log("[change-password] Got password hash from temp user");

      // Update the actual user's password
      await db
        .update(account)
        .set({ password: tempAccount.password })
        .where(eq(account.userId, session.user.id));

      console.log("[change-password] Password updated for actual user");

      // Clean up temp user
      await db.delete(account).where(eq(account.userId, tempUser.user.id));
      await db.delete(user).where(eq(user.id, tempUser.user.id));

      console.log("[change-password] Temp user cleaned up");

    } catch (error) {
      console.error("[change-password] Error during password update:", error);
      // Try to clean up temp user if it exists
      try {
        await db.delete(user).where(eq(user.email, tempEmail));
      } catch {}
      return { success: false, error: "Fehler beim Ändern des Passworts" };
    }

    // Remove mustChangePassword flag
    await db
      .update(user)
      .set({ mustChangePassword: false })
      .where(eq(user.id, session.user.id));

    console.log("[change-password] mustChangePassword flag removed");

    revalidatePath("/", "layout");

    console.log("[change-password] Password change successful");
    return { success: true };
  } catch (error) {
    console.error("[change-password] Unexpected error:", error);
    return {
      success: false,
      error: "Ein Fehler ist aufgetreten beim Ändern des Passworts",
    };
  }
}
