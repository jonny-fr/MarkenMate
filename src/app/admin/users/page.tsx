import { redirect } from "next/navigation";
import { getServerSession } from "@/lib/auth-server";
import { db } from "@/db";
import { user } from "@/db/schema";
import { eq, desc } from "drizzle-orm";
import { UserManagementClient } from "./_components/user-management-client";

export default async function AdminUsersPage() {
  const session = await getServerSession();

  if (!session?.user?.id) {
    redirect("/login");
  }

  // Verify admin role
  const [adminUser] = await db
    .select({ role: user.role })
    .from(user)
    .where(eq(user.id, session.user.id))
    .limit(1);

  if (adminUser?.role !== "admin") {
    redirect("/dashboard");
  }

  // Get all users
  const allUsers = await db
    .select({
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      createdAt: user.createdAt,
    })
    .from(user)
    .orderBy(desc(user.createdAt));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Benutzerverwaltung</h1>
        <p className="text-muted-foreground">
          Verwalten Sie Benutzer und Admin-Rollen
        </p>
      </div>

      <UserManagementClient users={allUsers} />
    </div>
  );
}
