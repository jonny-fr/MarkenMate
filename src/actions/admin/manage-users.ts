"use server";

import { z } from "zod";
import { getServerSession } from "@/lib/auth-server";
import { db } from "@/db";
import { user } from "@/db/schema";
import { eq, or, ilike } from "drizzle-orm";
import { revalidatePath } from "next/cache";

// Search users
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

    const users = await db
      .select({
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
      })
      .from(user)
      .where(
        or(ilike(user.name, `%${query}%`), ilike(user.email, `%${query}%`)),
      )
      .limit(10);

    return { success: true, users };
  } catch (error) {
    console.error("[search-users-admin] Error:", error);
    return { success: false, error: "Fehler bei der Suche" };
  }
}

// Toggle admin role
const toggleAdminSchema = z.object({
  userId: z.string().min(1),
});

export async function toggleAdminRole(formData: FormData) {
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

    const validationResult = toggleAdminSchema.safeParse({
      userId: formData.get("userId"),
    });

    if (!validationResult.success) {
      return { success: false, error: "Ungültige Eingabe" };
    }

    const { userId } = validationResult.data;

    // Get target user
    const [targetUser] = await db
      .select({ role: user.role })
      .from(user)
      .where(eq(user.id, userId))
      .limit(1);

    if (!targetUser) {
      return { success: false, error: "Benutzer nicht gefunden" };
    }

    // Toggle role
    const newRole = targetUser.role === "admin" ? "user" : "admin";

    await db.update(user).set({ role: newRole }).where(eq(user.id, userId));

    revalidatePath("/admin/users");

    return { success: true, newRole };
  } catch (error) {
    console.error("[toggle-admin-role] Error:", error);
    return { success: false, error: "Fehler beim Ändern der Rolle" };
  }
}
