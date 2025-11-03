import { redirect } from "next/navigation";
import { getServerSession } from "@/lib/auth-server";
import { db } from "@/db";
import { user, appLog } from "@/db/schema";
import { eq, desc, gte } from "drizzle-orm";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { FileText } from "lucide-react";

export default async function AdminLogsPage() {
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

  // Get logs from last 7 days
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

  const logs = await db
    .select({
      id: appLog.id,
      level: appLog.level,
      message: appLog.message,
      context: appLog.context,
      createdAt: appLog.createdAt,
    })
    .from(appLog)
    .where(gte(appLog.createdAt, sevenDaysAgo))
    .orderBy(desc(appLog.createdAt))
    .limit(100);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Anwendungslogs</h1>
        <p className="text-muted-foreground">
          Systemereignisse der letzten 7 Tage
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="size-5" />
            Log-Einträge ({logs.length})
          </CardTitle>
          <CardDescription>
            Die letzten 100 Log-Einträge, sortiert nach Datum
          </CardDescription>
        </CardHeader>
        <CardContent>
          {logs.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">
              Keine Logs in den letzten 7 Tagen
            </p>
          ) : (
            <div className="space-y-2 max-h-[600px] overflow-y-auto">
              {logs.map((log) => (
                <div
                  key={log.id}
                  className="flex items-start gap-3 rounded-lg border p-3 hover:bg-accent/50 transition-colors"
                >
                  <div
                    className={`mt-1 size-2 rounded-full flex-shrink-0 ${
                      log.level === "error"
                        ? "bg-destructive"
                        : log.level === "warn"
                          ? "bg-yellow-500"
                          : log.level === "debug"
                            ? "bg-blue-500"
                            : "bg-green-500"
                    }`}
                  />
                  <div className="flex-1 min-w-0 space-y-1">
                    <div className="flex items-center gap-2">
                      <Badge
                        variant={
                          log.level === "error"
                            ? "destructive"
                            : log.level === "warn"
                              ? "outline"
                              : "secondary"
                        }
                        className="text-xs"
                      >
                        {log.level.toUpperCase()}
                      </Badge>
                      <span className="text-xs text-muted-foreground">
                        {new Date(log.createdAt).toLocaleString("de-DE")}
                      </span>
                    </div>
                    <p className="text-sm font-medium break-words">
                      {log.message}
                    </p>
                    {log.context && (
                      <details className="text-xs text-muted-foreground">
                        <summary className="cursor-pointer hover:text-foreground">
                          Details anzeigen
                        </summary>
                        <pre className="mt-2 p-2 bg-muted rounded overflow-x-auto">
                          {log.context}
                        </pre>
                      </details>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
