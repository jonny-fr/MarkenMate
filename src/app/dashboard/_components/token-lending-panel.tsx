"use client";

import { use, useMemo, useState } from "react";
import { Minus, Plus, Users } from "lucide-react";

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

export type LendingUser = {
  id: string;
  name: string;
  balance: number;
  note?: string;
};

export function TokenLendingPanel({
  dataPromise,
}: {
  dataPromise: Promise<LendingUser[]>;
}) {
  const initialUsers = use(dataPromise);
  const [users, setUsers] = useState(initialUsers);

  const totalOutstanding = useMemo(
    () => users.reduce((sum, user) => sum + user.balance, 0),
    [users],
  );

  const adjustBalance = (id: string, delta: number) => {
    setUsers((prev) =>
      prev.map((user) =>
        user.id === id
          ? {
              ...user,
              balance: Math.max(user.balance + delta, 0),
            }
          : user,
      ),
    );
  };

  return (
    <Card id="lending" className="h-full">
      <CardHeader>
        <CardTitle>Markenleihen</CardTitle>
        <CardDescription>
          Verwalte ausgeliehene Essensmarken zwischen Teammitgliedern
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex flex-col gap-3">
          {users.map((user) => (
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
                </div>
                <span className="text-sm text-muted-foreground">
                  Schuldet aktuell {user.balance} Marken.
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
                  onClick={() => adjustBalance(user.id, -1)}
                >
                  <Minus className="size-4" />
                </Button>
                <Badge
                  variant="secondary"
                  className="min-w-12 justify-center px-3 py-1 text-base font-semibold"
                >
                  {user.balance}
                </Badge>
                <Button
                  type="button"
                  size="icon"
                  variant="outline"
                  className="size-8"
                  onClick={() => adjustBalance(user.id, 1)}
                >
                  <Plus className="size-4" />
                </Button>
              </div>
            </div>
          ))}
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
