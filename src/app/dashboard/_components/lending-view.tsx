"use client";

import { use, useMemo, useState } from "react";
import {
  Minus,
  Plus,
  MoreVertical,
  Trash2,
  Users,
  Check,
  X,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { AddLendingPersonDialog } from "./add-lending-person-dialog";
import { updateLendingAction } from "@/actions/update-lending";
import { deleteLendingAction } from "@/actions/delete-lending";
import { acceptLendingAction } from "@/actions/accept-lending";
import { toast } from "sonner";

export type LendingUser = {
  id: number;
  name: string;
  balance: number;
  status: "pending" | "accepted" | "declined";
  note?: string;
};

interface LendingViewProps {
  userId: string;
  dataPromise: Promise<LendingUser[]>;
}

export function LendingView({ userId, dataPromise }: LendingViewProps) {
  const initialUsers = use(dataPromise);
  const [users, setUsers] = useState(initialUsers);
  const [isUpdating, setIsUpdating] = useState<number | null>(null);

  // Berechne die Statistiken
  const stats = useMemo(() => {
    const lent = users.reduce((sum, user) => {
      // Positive balance = verliehen
      return sum + (user.balance > 0 ? user.balance : 0);
    }, 0);

    const owed = users.reduce((sum, user) => {
      // Negative balance = schulden
      return sum + (user.balance < 0 ? Math.abs(user.balance) : 0);
    }, 0);

    const total = lent - owed;

    return { lent, owed, total };
  }, [users]);

  const handleUpdateLending = async (lendingId: number, newBalance: number) => {
    setIsUpdating(lendingId);

    const formData = new FormData();
    formData.append("lendingId", lendingId.toString());
    formData.append("tokenCount", newBalance.toString());

    try {
      const result = await updateLendingAction(formData);
      if (result.success) {
        toast.success(result.message);
        setUsers((prev) =>
          prev.map((u) =>
            u.id === lendingId ? { ...u, balance: newBalance } : u,
          ),
        );
      } else {
        toast.error(result.message);
      }
    } catch (error) {
      toast.error("Fehler beim Aktualisieren");
      console.error(error);
    } finally {
      setIsUpdating(null);
    }
  };

  const handleDeleteLending = async (lendingId: number) => {
    if (
      !confirm("Sind Sie sicher, dass Sie diese Verleihung löschen möchten?")
    ) {
      return;
    }

    const formData = new FormData();
    formData.append("lendingId", lendingId.toString());

    try {
      const result = await deleteLendingAction(formData);
      if (result.success) {
        toast.success(result.message);
        setUsers((prev) => prev.filter((u) => u.id !== lendingId));
      } else {
        toast.error(result.message);
      }
    } catch (error) {
      toast.error("Fehler beim Löschen");
      console.error(error);
    }
  };

  const handleAcceptLending = async (
    lendingId: number,
    status: "accepted" | "declined",
  ) => {
    setIsUpdating(lendingId);

    const formData = new FormData();
    formData.append("lendingId", lendingId.toString());
    formData.append("status", status);

    try {
      const result = await acceptLendingAction(formData);
      if (result.success) {
        toast.success(result.message);
        setUsers((prev) =>
          prev.map((u) => (u.id === lendingId ? { ...u, status } : u)),
        );
      } else {
        toast.error(result.message);
      }
    } catch (error) {
      toast.error("Fehler beim Aktualisieren");
      console.error(error);
    } finally {
      setIsUpdating(null);
    }
  };

  // Sortiere Benutzer so, dass die mit nicht-Null-Balance oben sind
  const sortedUsers = useMemo(
    () => [...users].sort((a, b) => Math.abs(b.balance) - Math.abs(a.balance)),
    [users],
  );

  const pendingCount = useMemo(
    () => users.filter((u) => u.status === "pending").length,
    [users],
  );

  const getTotalColor = (total: number) => {
    if (total > 0) return "text-green-600";
    if (total < 0) return "text-red-600";
    return "text-muted-foreground";
  };

  const getBalanceBadgeClass = (balance: number) => {
    if (balance > 0)
      return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200";
    if (balance < 0)
      return "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200";
    return "";
  };

  return (
    <div className="space-y-6">
      {/* Überschrift */}
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight">Verleihen</h1>
        <AddLendingPersonDialog userId={userId} />
      </div>

      {/* Drei Container mit Statistiken */}
      <div className="grid gap-4 md:grid-cols-3">
        {/* Verliehen */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Verliehen</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-green-600">
              {stats.lent}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Marken an Personen verliehen
            </p>
          </CardContent>
        </Card>

        {/* Schulden */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Schulden</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-red-600">{stats.owed}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Marken zu begleichen
            </p>
          </CardContent>
        </Card>

        {/* Gesamt */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Gesamt</CardTitle>
          </CardHeader>
          <CardContent>
            <div className={`text-3xl font-bold ${getTotalColor(stats.total)}`}>
              {stats.total > 0 ? "+" : ""}
              {stats.total}
            </div>
            <p className="text-xs text-muted-foreground mt-1">Nettostand</p>
          </CardContent>
        </Card>
      </div>

      {/* Pending Requests */}
      {pendingCount > 0 && (
        <Card className="border-amber-200 bg-amber-50 dark:border-amber-900 dark:bg-amber-950">
          <CardHeader>
            <CardTitle className="text-amber-900 dark:text-amber-200">
              {pendingCount} ausstehende Anfrage{pendingCount !== 1 ? "n" : ""}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {sortedUsers
                .filter((u) => u.status === "pending")
                .map((user) => (
                  <div
                    key={user.id}
                    className="flex items-center justify-between gap-2 rounded-lg border border-amber-200 bg-background p-3 dark:border-amber-900"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-foreground">{user.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {user.balance} Marken verliehen
                      </p>
                    </div>
                    <div className="flex gap-1">
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-7 w-7"
                        onClick={() => handleAcceptLending(user.id, "accepted")}
                        disabled={isUpdating === user.id}
                        title="Akzeptieren"
                      >
                        <Check className="size-3 text-green-600" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-7 w-7"
                        onClick={() => handleAcceptLending(user.id, "declined")}
                        disabled={isUpdating === user.id}
                        title="Ablehnen"
                      >
                        <X className="size-3 text-red-600" />
                      </Button>
                    </div>
                  </div>
                ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Liste der Personen */}
      <Card>
        <CardHeader>
          <CardTitle>Personen</CardTitle>
          <CardDescription>
            Verwalte ausgeliehene und geschuldete Essensmarken
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {sortedUsers.length === 0 ? (
            <div className="flex items-center justify-center py-8 text-muted-foreground">
              Keine Personen hinzugefügt
            </div>
          ) : (
            sortedUsers
              .filter((u) => u.status !== "pending")
              .map((user) => (
                <div
                  key={user.id}
                  className="flex items-center justify-between rounded-lg border border-border/60 bg-card/70 p-3"
                >
                  <div className="flex flex-1 flex-col gap-1">
                    <div className="flex items-center gap-2">
                      <Users className="size-4" />
                      <span className="font-medium text-foreground">
                        {user.name}
                      </span>
                      {user.status === "accepted" && (
                        <Badge variant="secondary" className="text-xs">
                          Bestätigt
                        </Badge>
                      )}
                      {user.status === "declined" && (
                        <Badge variant="destructive" className="text-xs">
                          Abgelehnt
                        </Badge>
                      )}
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {user.note ?? "Keine Notiz"}
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    {/* Button je nach Balance-Typ */}
                    {user.balance < 0 ? (
                      // Schulden (negativ) - Plus-Button
                      <Button
                        type="button"
                        size="icon"
                        variant="outline"
                        className="size-8"
                        onClick={() =>
                          handleUpdateLending(user.id, user.balance + 1)
                        }
                        disabled={isUpdating === user.id}
                        title="Schulden verringern"
                      >
                        <Plus className="size-4" />
                      </Button>
                    ) : user.balance > 0 ? (
                      // Verliehen (positiv) - Minus-Button
                      <Button
                        type="button"
                        size="icon"
                        variant="outline"
                        className="size-8"
                        onClick={() =>
                          handleUpdateLending(user.id, user.balance - 1)
                        }
                        disabled={isUpdating === user.id}
                        title="Verliehene Marken verringern"
                      >
                        <Minus className="size-4" />
                      </Button>
                    ) : null}

                    {/* Anzeige der Marken */}
                    <Badge
                      variant={
                        user.balance < 0
                          ? "destructive"
                          : user.balance > 0
                            ? "default"
                            : "secondary"
                      }
                      className={`min-w-12 justify-center px-3 py-1 text-base font-semibold ${getBalanceBadgeClass(
                        user.balance,
                      )}`}
                    >
                      {user.balance < 0 ? "-" : user.balance > 0 ? "+" : ""}
                      {Math.abs(user.balance)}
                    </Badge>

                    {/* Drei-Punkte Menü */}
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          type="button"
                          size="icon"
                          variant="ghost"
                          className="size-8"
                        >
                          <MoreVertical className="size-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        {user.balance < 0 ? (
                          // Schulden - Minus-Option
                          <DropdownMenuItem
                            onClick={() =>
                              handleUpdateLending(user.id, user.balance - 1)
                            }
                          >
                            <Minus className="size-4 mr-2" />
                            Schulden erhöhen
                          </DropdownMenuItem>
                        ) : user.balance > 0 ? (
                          // Verliehen - Plus-Option
                          <DropdownMenuItem
                            onClick={() =>
                              handleUpdateLending(user.id, user.balance + 1)
                            }
                          >
                            <Plus className="size-4 mr-2" />
                            Verliehene Marken erhöhen
                          </DropdownMenuItem>
                        ) : null}

                        <DropdownMenuItem
                          onClick={() => handleDeleteLending(user.id)}
                          className="text-destructive focus:text-destructive"
                        >
                          <Trash2 className="size-4 mr-2" />
                          Löschen
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
              ))
          )}
        </CardContent>

        {/* Gesamt-Zeile am Ende */}
        {sortedUsers.filter((u) => u.status !== "pending").length > 0 && (
          <div className="border-t border-border/60 px-6 py-4 flex items-center justify-between">
            <span className="text-sm font-medium text-muted-foreground">
              Gesamtanzahl
            </span>
            <Badge
              variant="outline"
              className={`px-3 py-1 text-base font-semibold ${getTotalColor(stats.total)}`}
            >
              {stats.total > 0 ? "+" : ""}
              {stats.total}
            </Badge>
          </div>
        )}
      </Card>
    </div>
  );
}
