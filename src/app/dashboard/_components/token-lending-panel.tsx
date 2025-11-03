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
  CardFooter,
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

interface TokenLendingPanelProps {
  userId: string;
  dataPromise: Promise<LendingUser[]>;
}

export function TokenLendingPanel({
  userId,
  dataPromise,
}: TokenLendingPanelProps) {
  const initialUsers = use(dataPromise);
  const [users, setUsers] = useState(initialUsers);
  const [isUpdating, setIsUpdating] = useState<number | null>(null);

  const totalOutstanding = useMemo(
    () => users.reduce((sum, user) => sum + user.balance, 0),
    [users],
  );

  const pendingCount = useMemo(
    () => users.filter((u) => u.status === "pending").length,
    [users],
  );

  const handleUpdateLending = async (lendingId: number, newBalance: number) => {
    setIsUpdating(lendingId);

    const formData = new FormData();
    formData.append("lendingId", lendingId.toString());
    formData.append("tokenCount", newBalance.toString());

    try {
      const result = await updateLendingAction(formData);
      if (result.success) {
        toast.success(result.message);
        // Update local state
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

  return (
    <Card id="lending" className="h-full">
      <CardHeader className="flex flex-row items-center justify-between space-y-0">
        <div>
          <CardTitle>Markenleihen</CardTitle>
          <CardDescription>
            Verwalte ausgeliehene Essensmarken zwischen Teammitgliedern
          </CardDescription>
        </div>
        <AddLendingPersonDialog userId={userId} />
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Pending Requests */}
        {pendingCount > 0 && (
          <div className="space-y-3 rounded-lg border border-amber-200 bg-amber-50 p-3 dark:border-amber-900 dark:bg-amber-950">
            <p className="text-sm font-medium text-amber-900 dark:text-amber-200">
              {pendingCount} ausstehende Anfrage{pendingCount !== 1 ? "n" : ""}
            </p>
            <div className="space-y-2">
              {users
                .filter((u) => u.status === "pending")
                .map((user) => (
                  <div
                    key={user.id}
                    className="flex items-center justify-between gap-2 rounded-lg border border-amber-200 bg-background p-2 dark:border-amber-900"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground">
                        {user.name}
                      </p>
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
          </div>
        )}

        {/* Active Lendings */}
        <div className="flex flex-col gap-3">
          {users.length === 0 ? (
            <div className="flex items-center justify-center py-8 text-muted-foreground">
              Keine Personen hinzugefügt
            </div>
          ) : (
            users
              .filter((u) => u.status !== "pending")
              .map((user) => (
                <div
                  key={user.id}
                  className="flex flex-col gap-3 rounded-lg border border-border/60 bg-card/70 p-3 sm:flex-row sm:items-center sm:justify-between"
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
                    <span className="text-sm text-muted-foreground">
                      Schuldet aktuell {Math.abs(user.balance)} Marken
                      {user.balance < 0 ? " schuldig" : " verliehen"}.
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {user.note ??
                        "Offene Marken können jederzeit ausgeglichen werden."}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      type="button"
                      size="icon"
                      variant="outline"
                      className="size-8"
                      onClick={() =>
                        handleUpdateLending(user.id, user.balance - 1)
                      }
                      disabled={isUpdating === user.id}
                    >
                      <Minus className="size-4" />
                    </Button>
                    <Badge
                      variant="secondary"
                      className="min-w-12 justify-center px-3 py-1 text-base font-semibold"
                    >
                      {Math.abs(user.balance)}
                    </Badge>
                    <Button
                      type="button"
                      size="icon"
                      variant="outline"
                      className="size-8"
                      onClick={() =>
                        handleUpdateLending(user.id, user.balance + 1)
                      }
                      disabled={isUpdating === user.id}
                    >
                      <Plus className="size-4" />
                    </Button>

                    {/* Dropdown Menu */}
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
        </div>
      </CardContent>
      <CardFooter className="flex items-center justify-between text-sm text-muted-foreground">
        <span>Offene Marken gesamt</span>
        <Badge variant="outline" className="px-3 py-1 text-base font-semibold">
          {totalOutstanding}
        </Badge>
      </CardFooter>
    </Card>
  );
}
