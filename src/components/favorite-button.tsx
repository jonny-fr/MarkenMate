"use client";

import { useState } from "react";
import { Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toggleFavoriteAction } from "@/actions/toggle-favorite";
import { toast } from "sonner";

interface FavoriteButtonProps {
  userId: string;
  restaurantId?: number;
  menuItemId?: number;
  isFavorited: boolean;
  className?: string;
}

export function FavoriteButton({
  userId,
  restaurantId,
  menuItemId,
  isFavorited,
  className,
}: FavoriteButtonProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [favorited, setFavorited] = useState(isFavorited);

  const handleToggleFavorite = async () => {
    setIsLoading(true);

    const formData = new FormData();
    formData.append("userId", userId);
    if (restaurantId) {
      formData.append("restaurantId", restaurantId.toString());
    }
    if (menuItemId) {
      formData.append("menuItemId", menuItemId.toString());
    }

    try {
      const result = await toggleFavoriteAction(formData);

      if (result.success) {
        setFavorited(result.isFavorited ?? false);
        toast.success(
          result.isFavorited
            ? "Zu Favoriten hinzugefügt"
            : "Von Favoriten entfernt",
        );
      } else {
        toast.error(result.message);
      }
    } catch (error) {
      toast.error("Fehler beim Aktualisieren der Favoriten");
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Button
      type="button"
      size="icon"
      variant="ghost"
      className={className}
      onClick={handleToggleFavorite}
      disabled={isLoading}
      title={favorited ? "Von Favoriten entfernen" : "Zu Favoriten hinzufügen"}
    >
      <Star
        className={`size-4 ${
          favorited
            ? "fill-primary text-primary"
            : "text-muted-foreground hover:text-foreground"
        }`}
      />
    </Button>
  );
}
