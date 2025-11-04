"use client";

import { useState } from "react";
import { Loader2, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { requestStepUpToken } from "@/actions/admin/step-up-auth";
import { toast } from "sonner";

interface StepUpAuthDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: (token: string) => void;
  title?: string;
  description?: string;
}

/**
 * Step-Up Authentication Dialog
 *
 * Prompts user to re-enter their password before performing
 * sensitive operations like changing admin roles.
 *
 * Security Features:
 * - Password input (type="password")
 * - Loading state prevents multiple submissions
 * - Clear error messages
 * - Auto-focus on password field
 * - Keyboard navigation (Enter to submit, Escape to cancel)
 */
export function StepUpAuthDialog({
  open,
  onOpenChange,
  onSuccess,
  title = "Passwort bestätigen",
  description = "Bitte geben Sie Ihr Passwort ein, um fortzufahren.",
}: StepUpAuthDialogProps) {
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      const formData = new FormData();
      formData.append("password", password);

      const result = await requestStepUpToken(formData);

      if (result.success && result.token) {
        toast.success("Authentifizierung erfolgreich");
        setPassword("");
        onSuccess(result.token);
        onOpenChange(false);
      } else {
        setError(result.error || "Authentifizierung fehlgeschlagen");
      }
    } catch (err) {
      setError("Ein unerwarteter Fehler ist aufgetreten");
      console.error("Step-up auth error:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancel = () => {
    setPassword("");
    setError(null);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <div className="flex items-center gap-2">
              <Shield className="size-5 text-primary" />
              <DialogTitle>{title}</DialogTitle>
            </div>
            <DialogDescription>{description}</DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="password">Passwort</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Ihr Passwort eingeben"
                required
                autoFocus
                disabled={isLoading}
                autoComplete="current-password"
              />
            </div>

            {error && (
              <div className="rounded-md border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive">
                {error}
              </div>
            )}

            <div className="rounded-md border border-amber-500/50 bg-amber-500/10 p-3 text-sm text-amber-700 dark:text-amber-400">
              <p className="font-medium">Sicherheitshinweis:</p>
              <p className="mt-1 text-xs">
                Diese Aktion erfordert eine erneute Authentifizierung zum Schutz
                sensibler Operationen.
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={handleCancel}
              disabled={isLoading}
            >
              Abbrechen
            </Button>
            <Button type="submit" disabled={isLoading || !password}>
              {isLoading && <Loader2 className="size-4 animate-spin" />}
              {isLoading ? "Überprüfe..." : "Bestätigen"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
