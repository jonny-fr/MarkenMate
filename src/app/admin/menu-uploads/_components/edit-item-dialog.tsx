"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogClose,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";

export type EditedItemData = {
  dishName?: string;
  priceEur?: string; // keep as string to avoid locale issues
  category?: string | null;
  description?: string | null;
  options?: string | null; // JSON string
};

export interface EditItemDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  item: {
    id: number;
    dishName: string;
    priceEur: string;
    category: string | null;
    description: string | null;
    options: string | null;
  };
  initialValue?: EditedItemData;
  onSave: (itemId: number, data: EditedItemData) => void;
}

export function EditItemDialog({
  open,
  onOpenChange,
  item,
  initialValue,
  onSave,
}: EditItemDialogProps) {
  const [form, setForm] = useState<EditedItemData>({
    dishName: item.dishName,
    priceEur: item.priceEur,
    category: item.category ?? "",
    description: item.description ?? "",
    options: item.options ?? "",
  });

  useEffect(() => {
    setForm({
      dishName: initialValue?.dishName ?? item.dishName,
      priceEur: initialValue?.priceEur ?? item.priceEur,
      category:
        initialValue?.category === undefined
          ? item.category ?? ""
          : initialValue.category ?? "",
      description:
        initialValue?.description === undefined
          ? item.description ?? ""
          : initialValue.description ?? "",
      options:
        initialValue?.options === undefined
          ? item.options ?? ""
          : initialValue.options ?? "",
    });
  }, [item, initialValue]);

  const handleSubmit = () => {
    // Validate price
    if (!form.priceEur || Number.isNaN(Number.parseFloat(form.priceEur))) {
      toast.error("Bitte einen gültigen Preis angeben.");
      return;
    }

    // Validate options JSON if provided
    if (form.options) {
      try {
        JSON.parse(form.options);
      } catch {
        toast.error("Optionen müssen gültiges JSON sein (oder leer lassen).");
        return;
      }
    }

    onSave(item.id, form);
    onOpenChange(false);
    toast.success("Änderungen übernommen (als 'Bearbeiten' markiert)");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Eintrag bearbeiten</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <label htmlFor="edit-dish-name" className="text-sm text-muted-foreground">Gericht</label>
            <Input
              id="edit-dish-name"
              value={form.dishName ?? ""}
              onChange={(e) => setForm((f) => ({ ...f, dishName: e.target.value }))}
            />
          </div>
          <div>
            <label htmlFor="edit-price" className="text-sm text-muted-foreground">Preis (EUR)</label>
            <Input
              id="edit-price"
              value={form.priceEur ?? ""}
              onChange={(e) => setForm((f) => ({ ...f, priceEur: e.target.value }))}
            />
          </div>
          <div>
            <label htmlFor="edit-category" className="text-sm text-muted-foreground">Kategorie</label>
            <Input
              id="edit-category"
              value={form.category ?? ""}
              onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}
            />
          </div>
          <div>
            <label htmlFor="edit-description" className="text-sm text-muted-foreground">Beschreibung</label>
            <textarea
              id="edit-description"
              className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm"
              value={form.description ?? ""}
              onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
                setForm((f) => ({ ...f, description: e.target.value }))
              }
              rows={4}
            />
          </div>
          <div>
            <label htmlFor="edit-options" className="text-sm text-muted-foreground">Optionen (JSON)</label>
            <textarea
              id="edit-options"
              className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm font-mono"
              placeholder='z.B. {"size":"large"}'
              value={form.options ?? ""}
              onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
                setForm((f) => ({ ...f, options: e.target.value }))
              }
              rows={4}
            />
          </div>
        </div>

        <DialogFooter>
          <DialogClose asChild>
            <Button variant="outline">Abbrechen</Button>
          </DialogClose>
          <Button onClick={handleSubmit}>Speichern</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
