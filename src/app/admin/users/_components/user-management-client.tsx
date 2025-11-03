"use client";

import { useState } from "react";
import { Shield, ShieldOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toggleAdminRole } from "@/actions/admin/manage-users";
import { toast } from "sonner";

interface User {
  id: string;
  name: string;
  email: string;
  role: "user" | "admin";
  createdAt: Date;
}

interface UserManagementClientProps {
  users: User[];
}

export function UserManagementClient({
  users: initialUsers,
}: UserManagementClientProps) {
  const [users, setUsers] = useState(initialUsers);
  const [loadingUserId, setLoadingUserId] = useState<string | null>(null);

  const handleToggleRole = async (userId: string) => {
    setLoadingUserId(userId);

    try {
      const formData = new FormData();
      formData.append("userId", userId);

      const result = await toggleAdminRole(formData);

      if (result.success) {
        setUsers((prev) =>
          prev.map((u) =>
            u.id === userId
              ? { ...u, role: result.newRole as "user" | "admin" }
              : u,
          ),
        );
        toast.success("Rolle erfolgreich geändert");
      } else {
        toast.error(result.error || "Fehler beim Ändern der Rolle");
      }
    } catch (error) {
      toast.error("Ein Fehler ist aufgetreten");
      console.error(error);
    } finally {
      setLoadingUserId(null);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Alle Benutzer ({users.length})</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {users.map((user) => (
            <div
              key={user.id}
              className="flex items-center justify-between rounded-lg border p-4"
            >
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <p className="font-medium">{user.name}</p>
                  <Badge
                    variant={user.role === "admin" ? "default" : "secondary"}
                  >
                    {user.role === "admin" ? "Administrator" : "Benutzer"}
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground">{user.email}</p>
                <p className="text-xs text-muted-foreground">
                  Erstellt:{" "}
                  {new Date(user.createdAt).toLocaleDateString("de-DE")}
                </p>
              </div>
              <Button
                variant={user.role === "admin" ? "destructive" : "default"}
                size="sm"
                onClick={() => handleToggleRole(user.id)}
                disabled={loadingUserId === user.id}
              >
                {user.role === "admin" ? (
                  <>
                    <ShieldOff className="size-4 mr-2" />
                    Admin entfernen
                  </>
                ) : (
                  <>
                    <Shield className="size-4 mr-2" />
                    Zum Admin machen
                  </>
                )}
              </Button>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
