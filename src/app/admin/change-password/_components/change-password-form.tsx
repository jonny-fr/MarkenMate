"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { changePasswordAction } from "@/actions/change-password";
import { toast } from "sonner";

export function ChangePasswordForm() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (newPassword !== confirmPassword) {
      toast.error("Passwörter stimmen nicht überein");
      return;
    }

    if (newPassword.length < 8) {
      toast.error("Passwort muss mindestens 8 Zeichen lang sein");
      return;
    }

    setIsLoading(true);

    try {
      const formData = new FormData();
      formData.append("currentPassword", currentPassword);
      formData.append("newPassword", newPassword);

      const result = await changePasswordAction(formData);

      if (result.success) {
        toast.success("Passwort erfolgreich geändert");
        // Use full page reload to ensure all caches are cleared
        setTimeout(() => {
          window.location.href = "/admin";
        }, 500);
      } else {
        toast.error(result.error || "Fehler beim Ändern des Passworts");
      }
    } catch (error) {
      toast.error("Ein Fehler ist aufgetreten");
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Neues Passwort festlegen</CardTitle>
        <CardDescription>
          Ihr aktuelles Passwort ist temporär. Bitte wählen Sie ein neues, sicheres Passwort.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="currentPassword">Aktuelles Passwort</Label>
            <Input
              id="currentPassword"
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              required
              disabled={isLoading}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="newPassword">Neues Passwort</Label>
            <Input
              id="newPassword"
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              required
              disabled={isLoading}
              minLength={8}
            />
            <p className="text-sm text-muted-foreground">
              Mindestens 8 Zeichen
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="confirmPassword">Passwort bestätigen</Label>
            <Input
              id="confirmPassword"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              disabled={isLoading}
              minLength={8}
            />
          </div>

          <Button type="submit" className="w-full" disabled={isLoading}>
            {isLoading ? "Wird gespeichert..." : "Passwort ändern"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
