"use client";

import { use, useMemo, useState } from "react";
import { Minus, Plus, MoreVertical, Trash2, Users } from "lucide-react";

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

export type LendingUser = {
  id: string;
  name: string;
  balance: number;
  note?: string;
};

export function LendingView({
  dataPromise,
}: {
  dataPromise: Promise<LendingUser[]>;
}) {
  const initialUsers = use(dataPromise);
  const [users, setUsers] = useState(initialUsers);

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

  const adjustBalance = (id: string, delta: number) => {
    setUsers((prev) =>
      prev.map((user) =>
        user.id === id
          ? {
              ...user,
              balance: user.balance + delta,
            }
          : user
      )
    );
  };

  const clearBalance = (id: string) => {
    setUsers((prev) =>
      prev.map((user) =>
        user.id === id
          ? {
              ...user,
              balance: 0,
            }
          : user
      )
    );
  };

  // Sortiere Benutzer so, dass die mit nicht-Null-Balance oben sind
  const sortedUsers = useMemo(
    () => [...users].sort((a, b) => Math.abs(b.balance) - Math.abs(a.balance)),
    [users]
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
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Verleihen</h1>
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
            <div className="text-3xl font-bold text-red-600">
              {stats.owed}
            </div>
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
              {stats.total > 0 ? "+" : ""}{stats.total}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Nettostand
            </p>
          </CardContent>
        </Card>
      </div>

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
            sortedUsers.map((user) => (
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
                      onClick={() => adjustBalance(user.id, 1)}
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
                      onClick={() => adjustBalance(user.id, -1)}
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
                      user.balance
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
                          onClick={() => adjustBalance(user.id, -1)}
                        >
                          <Minus className="size-4 mr-2" />
                          Schulden erhöhen
                        </DropdownMenuItem>
                      ) : user.balance > 0 ? (
                        // Verliehen - Plus-Option
                        <DropdownMenuItem
                          onClick={() => adjustBalance(user.id, 1)}
                        >
                          <Plus className="size-4 mr-2" />
                          Verliehene Marken erhöhen
                        </DropdownMenuItem>
                      ) : null}

                      <DropdownMenuItem
                        onClick={() => clearBalance(user.id)}
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
        {sortedUsers.length > 0 && (
          <div className="border-t border-border/60 px-6 py-4 flex items-center justify-between">
            <span className="text-sm font-medium text-muted-foreground">
              Gesamtanzahl
            </span>
            <Badge
              variant="outline"
              className={`px-3 py-1 text-base font-semibold ${getTotalColor(stats.total)}`}
            >
              {stats.total > 0 ? "+" : ""}{stats.total}
            </Badge>
          </div>
        )}
      </Card>
    </div>
  );
}
