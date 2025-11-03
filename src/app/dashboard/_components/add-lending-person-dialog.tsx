"use client";

import { useState } from "react";
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
}

export function AddLendingPersonDialog({ userId }: AddLendingPersonDialogProps) {
  const [open, setOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState("");
  const [selectedUserName, setSelectedUserName] = useState("");
  const [tokenCount, setTokenCount] = useState(0);

  const handleUserSelect = (lendToUserId: string, lendToUserName: string) => {
    setSelectedUserId(lendToUserId);
    setSelectedUserName(lendToUserName);
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (!selectedUserId) {
      toast.error("Bitte wählen Sie eine Person aus");
      return;
    }

    if (tokenCount < 0) {
      toast.error("Die Token-Anzahl muss positiv sein");
      return;
    }

    setIsSubmitting(true);

    const formData = new FormData();
    formData.append("userId", userId);
    formData.append("lendToUserId", selectedUserId);
    formData.append("personName", selectedUserName);
    formData.append("tokenCount", tokenCount.toString());

    try {
      const result = await addLendingPersonAction(formData);

      if (result.success) {
        toast.success(result.message);
        setSelectedUserId("");
        setSelectedUserName("");
        setTokenCount(0);
        setOpen(false);
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
    <Dialog open={open} onOpenChange={setOpen}>
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
            <Label htmlFor="tokenCount">Anfängliche Marken (optional)</Label>
            <Input
              id="tokenCount"
              type="number"
              placeholder="0"
              value={tokenCount}
              onChange={(e) => setTokenCount(Number.parseInt(e.target.value) || 0)}
              disabled={isSubmitting}
              min="0"
            />
            <p className="text-xs text-muted-foreground">
              Geben Sie ein, wie viele Marken Sie dieser Person leihen möchten
            </p>
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
            <Button type="submit" disabled={isSubmitting || !selectedUserId}>
              {isSubmitting ? "Wird hinzugefügt..." : "Hinzufügen"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
