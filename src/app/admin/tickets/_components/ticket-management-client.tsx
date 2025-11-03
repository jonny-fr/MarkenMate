"use client";

import { useState } from "react";
import { Clock, CheckCircle2, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { updateTicketStatus } from "@/actions/tickets";
import { toast } from "sonner";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface Ticket {
  id: number;
  title: string;
  description: string;
  status: "open" | "in_progress" | "closed";
  priority: "low" | "medium" | "high" | "urgent";
  userName: string | null;
  userEmail: string | null;
  createdAt: Date;
  assignedToAdminId: string | null;
  closedByAdminId: string | null;
}

interface TicketManagementClientProps {
  tickets: Ticket[];
}

const priorityColors = {
  low: "bg-green-500",
  medium: "bg-blue-500",
  high: "bg-orange-500",
  urgent: "bg-red-500",
};

const statusIcons = {
  open: AlertCircle,
  in_progress: Clock,
  closed: CheckCircle2,
};

export function TicketManagementClient({
  tickets: initialTickets,
}: TicketManagementClientProps) {
  const [tickets, setTickets] = useState(initialTickets);
  const [filter, setFilter] = useState<
    "all" | "open" | "in_progress" | "closed"
  >("all");

  const handleStatusChange = async (ticketId: number, newStatus: string) => {
    try {
      const formData = new FormData();
      formData.append("ticketId", ticketId.toString());
      formData.append("status", newStatus);

      const result = await updateTicketStatus(formData);

      if (result.success) {
        setTickets((prev) =>
          prev.map((t) =>
            t.id === ticketId
              ? { ...t, status: newStatus as typeof t.status }
              : t,
          ),
        );
        toast.success("Status erfolgreich aktualisiert");
      } else {
        toast.error(result.error || "Fehler beim Aktualisieren");
      }
    } catch (error) {
      toast.error("Ein Fehler ist aufgetreten");
      console.error(error);
    }
  };

  const filteredTickets =
    filter === "all" ? tickets : tickets.filter((t) => t.status === filter);

  const stats = {
    open: tickets.filter((t) => t.status === "open").length,
    in_progress: tickets.filter((t) => t.status === "in_progress").length,
    closed: tickets.filter((t) => t.status === "closed").length,
  };

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">Offen</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.open}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">In Bearbeitung</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.in_progress}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">Geschlossen</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.closed}</div>
          </CardContent>
        </Card>
      </div>

      {/* Filter */}
      <div className="flex gap-2">
        <Button
          variant={filter === "all" ? "default" : "outline"}
          onClick={() => setFilter("all")}
          size="sm"
        >
          Alle
        </Button>
        <Button
          variant={filter === "open" ? "default" : "outline"}
          onClick={() => setFilter("open")}
          size="sm"
        >
          Offen
        </Button>
        <Button
          variant={filter === "in_progress" ? "default" : "outline"}
          onClick={() => setFilter("in_progress")}
          size="sm"
        >
          In Bearbeitung
        </Button>
        <Button
          variant={filter === "closed" ? "default" : "outline"}
          onClick={() => setFilter("closed")}
          size="sm"
        >
          Geschlossen
        </Button>
      </div>

      {/* Tickets */}
      <div className="space-y-4">
        {filteredTickets.map((ticket) => {
          const StatusIcon = statusIcons[ticket.status];

          return (
            <Card key={ticket.id}>
              <CardContent className="pt-6">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 space-y-2">
                    <div className="flex items-center gap-2">
                      <StatusIcon className="size-4" />
                      <h3 className="font-semibold">{ticket.title}</h3>
                      <div
                        className={`size-2 rounded-full ${priorityColors[ticket.priority]}`}
                      />
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {ticket.description}
                    </p>
                    <div className="flex items-center gap-4 text-xs text-muted-foreground">
                      <span>
                        Von: {ticket.userName} ({ticket.userEmail})
                      </span>
                      <span>
                        Erstellt:{" "}
                        {new Date(ticket.createdAt).toLocaleString("de-DE")}
                      </span>
                    </div>
                  </div>
                  <div className="flex flex-col gap-2">
                    <Select
                      value={ticket.status}
                      onValueChange={(value) =>
                        handleStatusChange(ticket.id, value)
                      }
                    >
                      <SelectTrigger className="w-[180px]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="open">Offen</SelectItem>
                        <SelectItem value="in_progress">
                          In Bearbeitung
                        </SelectItem>
                        <SelectItem value="closed">Geschlossen</SelectItem>
                      </SelectContent>
                    </Select>
                    <Badge variant="outline" className="text-xs">
                      {ticket.priority === "low" && "Niedrig"}
                      {ticket.priority === "medium" && "Mittel"}
                      {ticket.priority === "high" && "Hoch"}
                      {ticket.priority === "urgent" && "Dringend"}
                    </Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
        {filteredTickets.length === 0 && (
          <Card>
            <CardContent className="pt-6">
              <p className="text-center text-muted-foreground">
                Keine Tickets gefunden
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
