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

const updateEmailSchema = z.object({
  newEmail: z
    .string()
    .email("Ungültige E-Mail-Adresse")
    .min(1, "E-Mail-Adresse erforderlich"),
});

export async function updateEmailAction(formData: FormData) {
  try {
    const session = await getServerSession();

    if (!session?.user?.id) {
      return { success: false, error: "Nicht authentifiziert" };
    }

    // Check rate limit
    const rateLimitCheck = await canPerformAccountAction(
      session.user.id,
      "CHANGE_EMAIL",
    );

    if (!rateLimitCheck.allowed && rateLimitCheck.nextAllowedAt) {
      const timeRemaining = formatTimeRemaining(rateLimitCheck.nextAllowedAt);
      return {
        success: false,
        error: `Du kannst deine E-Mail nur 1x pro Tag ändern. Nächste Änderung möglich ${timeRemaining}.`,
      };
    }

    // Validate input
    const validationResult = updateEmailSchema.safeParse({
      newEmail: formData.get("newEmail"),
    });

    if (!validationResult.success) {
      return {
        success: false,
        error: validationResult.error.issues[0]?.message || "Ungültige Eingabe",
      };
    }

    const { newEmail } = validationResult.data;

    // Check if email is already taken
    const [existingUser] = await db
      .select({ id: user.id })
      .from(user)
      .where(eq(user.email, newEmail))
      .limit(1);

    if (existingUser) {
      return {
        success: false,
        error: "Diese E-Mail-Adresse wird bereits verwendet",
      };
    }

    // Update email
    await db
      .update(user)
      .set({ email: newEmail })
      .where(eq(user.id, session.user.id));

    // Record the action for rate limiting
    await recordAccountAction(session.user.id, "CHANGE_EMAIL");

    revalidatePath("/", "layout");

    return { success: true, message: "E-Mail-Adresse erfolgreich geändert" };
  } catch (error) {
    console.error("[update-email] Unexpected error:", error);
    return {
      success: false,
      error: "Ein Fehler ist aufgetreten beim Ändern der E-Mail-Adresse",
    };
  }
}
