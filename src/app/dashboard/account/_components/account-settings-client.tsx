"use client";

import { useState, useActionState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Lock, Mail, User, AlertCircle } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { changePasswordAction } from "@/actions/change-password";
import { updateEmailAction } from "@/actions/update-email";
import { updateUsernameAction } from "@/actions/update-username";

export function AccountSettingsClient({
  currentEmail,
  currentUsername,
}: {
  currentEmail: string;
  currentUsername: string;
}) {
  const router = useRouter();
  const [isPasswordLoading, setIsPasswordLoading] = useState(false);
  const [isEmailLoading, setIsEmailLoading] = useState(false);
  const [isUsernameLoading, setIsUsernameLoading] = useState(false);

  // Password change handler
  const handlePasswordChange = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsPasswordLoading(true);

    const formData = new FormData(e.currentTarget);

    try {
      const result = await changePasswordAction(formData);

      if (result.success) {
        toast.success(result.message || "Passwort erfolgreich geändert");
        (e.target as HTMLFormElement).reset();
      } else {
        toast.error(result.error || "Fehler beim Ändern des Passworts");
      }
    } catch (error) {
      toast.error("Ein unerwarteter Fehler ist aufgetreten");
    } finally {
      setIsPasswordLoading(false);
    }
  };

  // Email change handler
  const handleEmailChange = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsEmailLoading(true);

    const formData = new FormData(e.currentTarget);

    try {
      const result = await updateEmailAction(formData);

      if (result.success) {
        toast.success(result.message || "E-Mail-Adresse erfolgreich geändert");
        router.refresh();
      } else {
        toast.error(result.error || "Fehler beim Ändern der E-Mail-Adresse");
      }
    } catch (error) {
      toast.error("Ein unerwarteter Fehler ist aufgetreten");
    } finally {
      setIsEmailLoading(false);
    }
  };

  // Username change handler
  const handleUsernameChange = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsUsernameLoading(true);

    const formData = new FormData(e.currentTarget);

    try {
      const result = await updateUsernameAction(formData);

      if (result.success) {
        toast.success(result.message || "Benutzername erfolgreich geändert");
        router.refresh();
      } else {
        toast.error(result.error || "Fehler beim Ändern des Benutzernamens");
      }
    } catch (error) {
      toast.error("Ein unerwarteter Fehler ist aufgetreten");
    } finally {
      setIsUsernameLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Rate Limit Warning */}
      <Alert>
        <AlertCircle className="size-4" />
        <AlertDescription>
          Alle Account-Änderungen sind auf 1x pro Tag limitiert.
        </AlertDescription>
      </Alert>

      {/* Password Change */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Lock className="size-5" />
            Passwort ändern
          </CardTitle>
          <CardDescription>
            Ändere dein Passwort. Du kannst dies nur 1x pro Tag tun.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handlePasswordChange} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="currentPassword">Aktuelles Passwort</Label>
              <Input
                id="currentPassword"
                name="currentPassword"
                type="password"
                placeholder="••••••••"
                required
                disabled={isPasswordLoading}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="newPassword">Neues Passwort</Label>
              <Input
                id="newPassword"
                name="newPassword"
                type="password"
                placeholder="••••••••"
                required
                minLength={8}
                disabled={isPasswordLoading}
              />
              <p className="text-xs text-muted-foreground">
                Mindestens 8 Zeichen
              </p>
            </div>
            <Button type="submit" disabled={isPasswordLoading}>
              {isPasswordLoading ? "Wird geändert..." : "Passwort ändern"}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Email Change */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Mail className="size-5" />
            E-Mail-Adresse ändern
          </CardTitle>
          <CardDescription>
            Ändere deine E-Mail-Adresse. Du kannst dies nur 1x pro Tag tun.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleEmailChange} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="currentEmail">Aktuelle E-Mail-Adresse</Label>
              <Input
                id="currentEmail"
                type="email"
                value={currentEmail}
                disabled
                className="bg-muted"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="newEmail">Neue E-Mail-Adresse</Label>
              <Input
                id="newEmail"
                name="newEmail"
                type="email"
                placeholder="neue-email@beispiel.de"
                required
                disabled={isEmailLoading}
              />
            </div>
            <Button type="submit" disabled={isEmailLoading}>
              {isEmailLoading ? "Wird geändert..." : "E-Mail ändern"}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Username Change */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="size-5" />
            Benutzername ändern
          </CardTitle>
          <CardDescription>
            Ändere deinen Benutzernamen. Du kannst dies nur 1x pro Tag tun.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleUsernameChange} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="currentUsername">Aktueller Benutzername</Label>
              <Input
                id="currentUsername"
                type="text"
                value={currentUsername}
                disabled
                className="bg-muted"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="newUsername">Neuer Benutzername</Label>
              <Input
                id="newUsername"
                name="newUsername"
                type="text"
                placeholder="Neuer Name"
                required
                minLength={2}
                maxLength={50}
                disabled={isUsernameLoading}
              />
              <p className="text-xs text-muted-foreground">
                2-50 Zeichen, nur Buchstaben und Leerzeichen
              </p>
            </div>
            <Button type="submit" disabled={isUsernameLoading}>
              {isUsernameLoading ? "Wird geändert..." : "Benutzername ändern"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
