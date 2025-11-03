import { redirect } from "next/navigation";
import { getServerSession } from "@/lib/auth-server";
import { db } from "@/db";
import { user, ticket, appLog } from "@/db/schema";
import { eq, sql, desc } from "drizzle-orm";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, Ticket as TicketIcon, AlertCircle, CheckCircle } from "lucide-react";

export default async function AdminDashboardPage() {
  const session = await getServerSession();

  if (!session?.user?.id) {
    redirect("/login");
  }

  // Get statistics
  const [userStats] = await db
    .select({
      totalUsers: sql<number>`count(*)::int`,
      totalAdmins: sql<number>`count(case when ${user.role} = 'admin' then 1 end)::int`,
    })
    .from(user);

  const [ticketStats] = await db
    .select({
      totalTickets: sql<number>`count(*)::int`,
      openTickets: sql<number>`count(case when ${ticket.status} = 'open' then 1 end)::int`,
      inProgressTickets: sql<number>`count(case when ${ticket.status} = 'in_progress' then 1 end)::int`,
    })
    .from(ticket);

  const recentLogs = await db
    .select({
      id: appLog.id,
      level: appLog.level,
      message: appLog.message,
      createdAt: appLog.createdAt,
    })
    .from(appLog)
    .orderBy(desc(appLog.createdAt))
    .limit(10);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold">Admin Dashboard</h1>
        <p className="text-muted-foreground">
          Willkommen im Verwaltungsbereich
        </p>
      </div>

      {/* Statistics Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Benutzer gesamt
            </CardTitle>
            <Users className="size-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{userStats.totalUsers}</div>
            <p className="text-xs text-muted-foreground">
              {userStats.totalAdmins} Administratoren
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Offene Tickets</CardTitle>
            <TicketIcon className="size-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{ticketStats.openTickets}</div>
            <p className="text-xs text-muted-foreground">
              Benötigen Aufmerksamkeit
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              In Bearbeitung
            </CardTitle>
            <AlertCircle className="size-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {ticketStats.inProgressTickets}
            </div>
            <p className="text-xs text-muted-foreground">Aktive Tickets</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Tickets gesamt</CardTitle>
            <CheckCircle className="size-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{ticketStats.totalTickets}</div>
            <p className="text-xs text-muted-foreground">
              Alle Anfragen
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Recent Logs */}
      <Card>
        <CardHeader>
          <CardTitle>Aktuelle Logs</CardTitle>
          <CardDescription>
            Die letzten 10 Systemereignisse
          </CardDescription>
        </CardHeader>
        <CardContent>
          {recentLogs.length === 0 ? (
            <p className="text-sm text-muted-foreground">Keine Logs vorhanden</p>
          ) : (
            <div className="space-y-2">
              {recentLogs.map((log) => (
                <div
                  key={log.id}
                  className="flex items-start gap-3 rounded-lg border p-3"
                >
                  <div
                    className={`mt-0.5 size-2 rounded-full ${
                      log.level === "error"
                        ? "bg-destructive"
                        : log.level === "warn"
                          ? "bg-yellow-500"
                          : "bg-green-500"
                    }`}
                  />
                  <div className="flex-1 space-y-1">
                    <p className="text-sm font-medium">{log.message}</p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(log.createdAt).toLocaleString("de-DE")}
                    </p>
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
