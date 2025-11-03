import { redirect } from "next/navigation";
import { getServerSession } from "@/lib/auth-server";
import { db } from "@/db";
import { user } from "@/db/schema";
import { eq } from "drizzle-orm";
import { AdminSidebar } from "./_components/admin-sidebar";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getServerSession();

  if (!session?.user?.id) {
    redirect("/login");
  }

  // Verify admin role
  const [userDetails] = await db
    .select({
      role: user.role,
      mustChangePassword: user.mustChangePassword,
    })
    .from(user)
    .where(eq(user.id, session.user.id))
    .limit(1);

  if (userDetails?.role !== "admin") {
    redirect("/dashboard");
  }

  // If password change is required, allow only change-password page
  if (userDetails?.mustChangePassword) {
    return <>{children}</>;
  }

  return (
    <div className="flex min-h-screen bg-background">
      <AdminSidebar userName={session.user.name || "Admin"} />
      <main className="flex-1 overflow-y-auto p-8">{children}</main>
    </div>
  );
}
