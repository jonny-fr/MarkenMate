"use server";

import "server-only";
import { z } from "zod";
import { getServerSession } from "@/lib/auth-server";
import { db } from "@/db";
import { user } from "@/db/schema";
import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import {
  canPerformAccountAction,
  recordAccountAction,
  formatTimeRemaining,
} from "@/lib/rate-limit";

const updateUsernameSchema = z.object({
  newUsername: z
    .string()
    .min(2, "Benutzername muss mindestens 2 Zeichen lang sein")
    .max(50, "Benutzername darf maximal 50 Zeichen lang sein")
    .regex(
      /^[a-zA-ZäöüÄÖÜß\s]+$/,
      "Benutzername darf nur Buchstaben und Leerzeichen enthalten",
    ),
});

export async function updateUsernameAction(formData: FormData) {
  try {
    const session = await getServerSession();

    if (!session?.user?.id) {
      return { success: false, error: "Nicht authentifiziert" };
    }

    // Check rate limit
    const rateLimitCheck = await canPerformAccountAction(
      session.user.id,
      "CHANGE_USERNAME",
    );

    if (!rateLimitCheck.allowed && rateLimitCheck.nextAllowedAt) {
      const timeRemaining = formatTimeRemaining(rateLimitCheck.nextAllowedAt);
      return {
        success: false,
        error: `Du kannst deinen Benutzernamen nur 1x pro Tag ändern. Nächste Änderung möglich ${timeRemaining}.`,
      };
    }

    // Validate input
    const validationResult = updateUsernameSchema.safeParse({
      newUsername: formData.get("newUsername"),
    });

    if (!validationResult.success) {
      return {
        success: false,
        error: validationResult.error.issues[0]?.message || "Ungültige Eingabe",
      };
    }

    const { newUsername } = validationResult.data;

    // Update username
    await db
      .update(user)
      .set({ name: newUsername })
      .where(eq(user.id, session.user.id));

    // Record the action for rate limiting
    await recordAccountAction(session.user.id, "CHANGE_USERNAME");

    revalidatePath("/", "layout");

    return { success: true, message: "Benutzername erfolgreich geändert" };
  } catch (error) {
    console.error("[update-username] Unexpected error:", error);
    return {
      success: false,
      error: "Ein Fehler ist aufgetreten beim Ändern des Benutzernamens",
    };
  }
}
