import { redirect } from "next/navigation";
import { getServerSession } from "@/lib/auth-server";
import { db } from "@/db";
import { user } from "@/db/schema";
import { eq } from "drizzle-orm";
import { getBackupHistory } from "@/actions/admin/database-backup";
import { BackupManagementClient } from "./_components/backup-management-client";

export default async function AdminBackupsPage() {
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

  // Fetch backup history
  const backupHistory = await getBackupHistory();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Datenbank-Backups</h1>
        <p className="text-muted-foreground">
          Sichern und wiederherstellen Sie Ihre Datenbankdaten
        </p>
      </div>

      <BackupManagementClient
        backupHistoryPromise={Promise.resolve(backupHistory)}
      />
    </div>
  );
}
