"use server";

import { z } from "zod";
import { getServerSession } from "@/lib/auth-server";
import { db } from "@/db";
import { ticket, user } from "@/db/schema";
import { eq, desc, or } from "drizzle-orm";
import { revalidatePath } from "next/cache";

// Create ticket (for all users)
const createTicketSchema = z.object({
  title: z.string().min(3, "Titel muss mindestens 3 Zeichen lang sein"),
  description: z.string().min(10, "Beschreibung muss mindestens 10 Zeichen lang sein"),
  priority: z.enum(["low", "medium", "high", "urgent"]),
});

export async function createTicket(formData: FormData) {
  try {
    const session = await getServerSession();

    if (!session?.user?.id) {
      return { success: false, error: "Nicht authentifiziert" };
    }

    const validationResult = createTicketSchema.safeParse({
      title: formData.get("title"),
      description: formData.get("description"),
      priority: formData.get("priority"),
    });

    if (!validationResult.success) {
      return {
        success: false,
        error: validationResult.error.issues[0]?.message || "Ungültige Eingabe",
      };
    }

    const { title, description, priority } = validationResult.data;

    await db.insert(ticket).values({
      userId: session.user.id,
      title,
      description,
      priority,
      status: "open",
    });

    revalidatePath("/dashboard");
    revalidatePath("/admin/tickets");

    return { success: true };
  } catch (error) {
    console.error("[create-ticket] Error:", error);
    return { success: false, error: "Fehler beim Erstellen des Tickets" };
  }
}

// Update ticket status (admin only)
const updateTicketSchema = z.object({
  ticketId: z.number(),
  status: z.enum(["open", "in_progress", "closed"]),
});

export async function updateTicketStatus(formData: FormData) {
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

    const validationResult = updateTicketSchema.safeParse({
      ticketId: Number(formData.get("ticketId")),
      status: formData.get("status"),
    });

    if (!validationResult.success) {
      return { success: false, error: "Ungültige Eingabe" };
    }

    const { ticketId, status } = validationResult.data;

    const updateData: {
      status: typeof status;
      assignedToAdminId?: string;
      closedByAdminId?: string;
      closedAt?: Date;
    } = {
      status,
    };

    if (status === "in_progress") {
      updateData.assignedToAdminId = session.user.id;
    } else if (status === "closed") {
      updateData.closedByAdminId = session.user.id;
      updateData.closedAt = new Date();
    }

    await db.update(ticket).set(updateData).where(eq(ticket.id, ticketId));

    revalidatePath("/admin/tickets");

    return { success: true };
  } catch (error) {
    console.error("[update-ticket-status] Error:", error);
    return { success: false, error: "Fehler beim Aktualisieren des Tickets" };
  }
}

// Get user's tickets
export async function getUserTickets() {
  try {
    const session = await getServerSession();

    if (!session?.user?.id) {
      return { success: false, error: "Nicht authentifiziert" };
    }

    const tickets = await db
      .select({
        id: ticket.id,
        title: ticket.title,
        description: ticket.description,
        status: ticket.status,
        priority: ticket.priority,
        createdAt: ticket.createdAt,
      })
      .from(ticket)
      .where(eq(ticket.userId, session.user.id))
      .orderBy(desc(ticket.createdAt));

    return { success: true, tickets };
  } catch (error) {
    console.error("[get-user-tickets] Error:", error);
    return { success: false, error: "Fehler beim Laden der Tickets" };
  }
}

// Get all tickets (admin only)
export async function getAllTickets() {
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

    const tickets = await db
      .select({
        id: ticket.id,
        title: ticket.title,
        description: ticket.description,
        status: ticket.status,
        priority: ticket.priority,
        userName: user.name,
        userEmail: user.email,
        createdAt: ticket.createdAt,
        assignedToAdminId: ticket.assignedToAdminId,
        closedByAdminId: ticket.closedByAdminId,
      })
      .from(ticket)
      .leftJoin(user, eq(ticket.userId, user.id))
      .orderBy(desc(ticket.createdAt));

    return { success: true, tickets };
  } catch (error) {
    console.error("[get-all-tickets] Error:", error);
    return { success: false, error: "Fehler beim Laden der Tickets" };
  }
}
