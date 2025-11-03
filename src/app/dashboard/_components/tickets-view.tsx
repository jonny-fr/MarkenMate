"use client";

import { use, useState } from "react";
import { Plus, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { createTicket } from "@/actions/tickets";
import { toast } from "sonner";

interface Ticket {
  id: number;
  title: string;
  description: string;
  status: "open" | "in_progress" | "closed";
  priority: "low" | "medium" | "high" | "urgent";
  createdAt: Date;
}

interface TicketsViewProps {
  ticketsPromise: Promise<{ success: boolean; tickets?: Ticket[]; error?: string }>;
}

const statusLabels = {
  open: "Offen",
  in_progress: "In Bearbeitung",
  closed: "Geschlossen",
};

const priorityLabels = {
  low: "Niedrig",
  medium: "Mittel",
  high: "Hoch",
  urgent: "Dringend",
};

const statusColors = {
  open: "bg-blue-500/10 text-blue-600 border-blue-500/20",
  in_progress: "bg-yellow-500/10 text-yellow-600 border-yellow-500/20",
  closed: "bg-green-500/10 text-green-600 border-green-500/20",
};

const priorityColors = {
  low: "bg-slate-500/10 text-slate-600 border-slate-500/20",
  medium: "bg-blue-500/10 text-blue-600 border-blue-500/20",
  high: "bg-orange-500/10 text-orange-600 border-orange-500/20",
  urgent: "bg-red-500/10 text-red-600 border-red-500/20",
};

function CreateTicketDialog() {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    
    const formData = new FormData(e.currentTarget);
    const result = await createTicket(formData);
    
    if (result.success) {
      toast.success("Ticket erfolgreich erstellt");
      setOpen(false);
      e.currentTarget.reset();
    } else {
      setError(result.error || "Fehler beim Erstellen des Tickets");
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="size-4" />
          Ticket erstellen
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[525px]">
        <DialogHeader>
          <DialogTitle>Neues Support-Ticket</DialogTitle>
          <DialogDescription>
            Erstellen Sie ein Ticket für technische Fragen oder Probleme.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="title">Titel</Label>
            <Input
              id="title"
              name="title"
              placeholder="Kurze Beschreibung des Problems"
              required
              minLength={3}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="description">Beschreibung</Label>
            <textarea
              id="description"
              name="description"
              placeholder="Detaillierte Beschreibung des Problems..."
              required
              minLength={10}
              className="min-h-[120px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="priority">Priorität</Label>
            <select
              id="priority"
              name="priority"
              required
              title="Priorität auswählen"
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            >
              <option value="low">Niedrig</option>
              <option value="medium">Mittel</option>
              <option value="high">Hoch</option>
              <option value="urgent">Dringend</option>
            </select>
          </div>
          {error && (
            <div className="flex items-center gap-2 rounded-md border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive">
              <AlertCircle className="size-4" />
              {error}
            </div>
          )}
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Abbrechen
            </Button>
            <Button type="submit">Ticket erstellen</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function TicketsView({ ticketsPromise }: TicketsViewProps) {
  const result = use(ticketsPromise);

  if (!result.success || !result.tickets) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold tracking-tight">Support-Tickets</h2>
            <p className="text-muted-foreground">
              Verwalten Sie Ihre Support-Anfragen
            </p>
          </div>
          <CreateTicketDialog />
        </div>
        <Card>
          <CardContent className="pt-6">
            <p className="text-center text-muted-foreground">
              {result.error || "Fehler beim Laden der Tickets"}
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const tickets = result.tickets;
  const openTickets = tickets.filter((t) => t.status === "open");
  const inProgressTickets = tickets.filter((t) => t.status === "in_progress");
  const closedTickets = tickets.filter((t) => t.status === "closed");

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Support-Tickets</h2>
          <p className="text-muted-foreground">
            Verwalten Sie Ihre Support-Anfragen
          </p>
        </div>
        <CreateTicketDialog />
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Offen</CardDescription>
            <CardTitle className="text-3xl">{openTickets.length}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>In Bearbeitung</CardDescription>
            <CardTitle className="text-3xl">{inProgressTickets.length}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Geschlossen</CardDescription>
            <CardTitle className="text-3xl">{closedTickets.length}</CardTitle>
          </CardHeader>
        </Card>
      </div>

      {/* Tickets List */}
      {tickets.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground">
              Sie haben noch keine Tickets erstellt.
            </p>
            <p className="mt-2 text-sm text-muted-foreground">
              Klicken Sie auf "Ticket erstellen" um ein neues Support-Ticket anzulegen.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {tickets.map((ticket) => (
            <Card key={ticket.id}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="space-y-1 flex-1">
                    <CardTitle className="text-lg">{ticket.title}</CardTitle>
                    <CardDescription className="line-clamp-2">
                      {ticket.description}
                    </CardDescription>
                  </div>
                  <div className="flex flex-col items-end gap-2 ml-4">
                    <Badge className={statusColors[ticket.status]}>
                      {statusLabels[ticket.status]}
                    </Badge>
                    <Badge variant="outline" className={priorityColors[ticket.priority]}>
                      {priorityLabels[ticket.priority]}
                    </Badge>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  Erstellt am {new Date(ticket.createdAt).toLocaleDateString("de-DE", {
                    day: "2-digit",
                    month: "2-digit",
                    year: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
