import { redirect } from "next/navigation";
import { getServerSession } from "@/lib/auth-server";
import { db } from "@/db";
import { user } from "@/db/schema";
import { eq } from "drizzle-orm";
import { getAllTickets } from "@/actions/tickets";
import { TicketManagementClient } from "./_components/ticket-management-client";

export default async function AdminTicketsPage() {
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

  const result = await getAllTickets();

  if (!result.success || !result.tickets) {
    return <div>Fehler beim Laden der Tickets</div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Ticket-Verwaltung</h1>
        <p className="text-muted-foreground">Alle Support-Anfragen verwalten</p>
      </div>

      <TicketManagementClient tickets={result.tickets} />
    </div>
  );
}
