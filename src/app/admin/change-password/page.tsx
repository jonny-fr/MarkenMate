import { redirect } from "next/navigation";
import { getServerSession } from "@/lib/auth-server";
import { db } from "@/db";
import { user } from "@/db/schema";
import { eq } from "drizzle-orm";
import { ChangePasswordForm } from "./_components/change-password-form";

export default async function ChangePasswordPage() {
  const session = await getServerSession();

  if (!session?.user?.id) {
    redirect("/login");
  }

  // Check if user actually needs to change password
  const [userDetails] = await db
    .select({
      mustChangePassword: user.mustChangePassword,
      role: user.role,
    })
    .from(user)
    .where(eq(user.id, session.user.id))
    .limit(1);

  if (!userDetails?.mustChangePassword) {
    // User doesn't need to change password, redirect based on role
    redirect(userDetails?.role === "admin" ? "/admin" : "/dashboard");
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <div className="w-full max-w-md space-y-6">
        <div className="space-y-2 text-center">
          <h1 className="text-3xl font-bold">Passwort ändern</h1>
          <p className="text-muted-foreground">
            Bitte ändern Sie Ihr Passwort, bevor Sie fortfahren.
          </p>
        </div>
        <ChangePasswordForm />
      </div>
    </div>
  );
}
