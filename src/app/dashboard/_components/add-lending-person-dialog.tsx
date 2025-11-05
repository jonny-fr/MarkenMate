"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { UserSearchCombobox } from "@/components/user-search-combobox";
import { addLendingPersonAction } from "@/actions/add-lending-person";
import { toast } from "sonner";

interface AddLendingPersonDialogProps {
  userId: string;
  onSuccess?: () => void;
}

export function AddLendingPersonDialog({
  userId,
  onSuccess,
}: AddLendingPersonDialogProps) {
  const [open, setOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState("");
  const [selectedUserName, setSelectedUserName] = useState("");
  const [tokenCount, setTokenCount] = useState("");
  const [tokenError, setTokenError] = useState<string | null>(null);
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const trimmedTokenCount = tokenCount.trim();
  const numericTokenCount = Number(trimmedTokenCount);
  const isTokenCountNumeric = Number.isFinite(numericTokenCount);
  const isValidTokenCount =
    trimmedTokenCount.length > 0 &&
    isTokenCountNumeric &&
    Number.isInteger(numericTokenCount) &&
    numericTokenCount > 0;
  const inlineTokenError =
    tokenError ??
    (trimmedTokenCount.length > 0 && !isValidTokenCount
      ? "Bitte geben Sie mehr als 0 Marken ein"
      : null);

  const handleUserSelect = (lendToUserId: string, lendToUserName: string) => {
    setSelectedUserId(lendToUserId);
    setSelectedUserName(lendToUserName);
  };

  const resetFormState = () => {
    setSelectedUserId("");
    setSelectedUserName("");
    setTokenCount("");
    setTokenError(null);
  };

  const requireValidTokenCount = () => {
    if (!isValidTokenCount) {
      const message = "Bitte geben Sie mehr als 0 Marken ein";
      setTokenError(message);
      toast.error(message);
      return false;
    }

    setTokenError(null);
    return numericTokenCount;
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (!selectedUserId) {
      toast.error("Bitte wählen Sie eine Person aus");
      return;
    }

    const validTokenCount = requireValidTokenCount();
    if (validTokenCount === false) {
      return;
    }

    setIsSubmitting(true);

    const formData = new FormData();
    formData.append("userId", userId);
    formData.append("lendToUserId", selectedUserId);
    formData.append("personName", selectedUserName);
  formData.append("tokenCount", validTokenCount.toString());

    try {
      const result = await addLendingPersonAction(formData);

      if (result.success) {
        toast.success(result.message);
        resetFormState();
        setOpen(false);
        // Force router refresh to re-fetch server data
        startTransition(() => {
          router.refresh();
        });
        onSuccess?.();
      } else {
        toast.error(result.message);
      }
    } catch (error) {
      toast.error("Fehler beim Hinzufügen der Person");
      console.error(error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        setOpen(nextOpen);
        if (!nextOpen) {
          resetFormState();
        }
      }}
    >
      <DialogTrigger asChild>
        <Button size="sm" variant="outline" className="gap-2">
          <Plus className="size-4" />
          Person hinzufügen
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Neue Person hinzufügen</DialogTitle>
          <DialogDescription>
            Fügen Sie eine neue Person hinzu, mit der Sie Essensmarken teilen
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="personSearch">Person auswählen</Label>
            <UserSearchCombobox
              currentUserId={userId}
              value={selectedUserId}
              onSelect={handleUserSelect}
              disabled={isSubmitting}
              placeholder="Benutzer suchen..."
            />
            <p className="text-xs text-muted-foreground">
              Suchen Sie nach Name oder E-Mail-Adresse
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="tokenCount">Anfängliche Marken</Label>
            <Input
              id="tokenCount"
              type="number"
              placeholder="1"
              value={tokenCount}
              onChange={(event) => {
                setTokenCount(event.target.value);
                if (tokenError) {
                  setTokenError(null);
                }
              }}
              disabled={isSubmitting}
              min="1"
              inputMode="numeric"
              aria-invalid={Boolean(inlineTokenError)}
            />
            <p className="text-xs text-muted-foreground">
              Geben Sie ein, wie viele Marken Sie dieser Person leihen möchten
              (mindestens eine Marke)
            </p>
            {inlineTokenError ? (
              <p className="text-xs text-destructive">{inlineTokenError}</p>
            ) : null}
          </div>

          <div className="flex gap-2 justify-end">
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={isSubmitting}
            >
              Abbrechen
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting || !selectedUserId || !isValidTokenCount}
            >
              {isSubmitting ? "Wird hinzugefügt..." : "Hinzufügen"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
