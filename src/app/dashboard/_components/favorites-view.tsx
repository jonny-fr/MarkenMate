"use client";

import { use } from "react";
import { MapPin, Trash2 } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { FavoriteButton } from "@/components/favorite-button";
import { toast } from "sonner";

export type FavoriteRestaurant = {
  id: number;
  name: string;
  location: string;
  tag: string;
  rating: string | null;
  isFavorited: true;
};

export type FavoriteMenuItem = {
  id: number;
  dishName: string;
  category: string;
  type: string;
  price: string;
  restaurantId: number;
  restaurantName: string;
  isFavorited: true;
};

interface FavoritesViewProps {
  userId: string;
  dataPromise: Promise<{
    restaurants: FavoriteRestaurant[];
    menuItems: FavoriteMenuItem[];
  }>;
}

export function FavoritesView({ userId, dataPromise }: FavoritesViewProps) {
  const data = use(dataPromise);
  const { restaurants, menuItems } = data;



  return (
    <div className="space-y-6">
      {/* Favoriten Restaurants */}
      <Card>
        <CardHeader>
          <CardTitle>Lieblings-Restaurants</CardTitle>
          <CardDescription>
            {restaurants.length} Restaurant
            {restaurants.length !== 1 ? "s" : ""} als Favoriten markiert
          </CardDescription>
        </CardHeader>
        <CardContent>
          {restaurants.length === 0 ? (
            <div className="flex items-center justify-center py-8 text-muted-foreground">
              Keine Restaurant-Favoriten gespeichert
            </div>
          ) : (
            <div className="space-y-3">
              {restaurants.map((restaurant) => (
                <div
                  key={restaurant.id}
                  className="flex items-start justify-between gap-3 rounded-lg border border-border/60 bg-card/70 p-4"
                >
                  <div className="flex-1 space-y-2">
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold text-foreground">
                        {restaurant.name}
                      </h3>
                      <Badge variant="secondary">{restaurant.tag}</Badge>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <MapPin className="size-4" />
                      {restaurant.location}
                    </div>
                    {restaurant.rating && (
                      <div className="text-sm text-muted-foreground">
                        ⭐ {restaurant.rating}
                      </div>
                    )}
                  </div>
                  <FavoriteButton
                    userId={userId}
                    restaurantId={restaurant.id}
                    isFavorited={true}
                  />
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Favoriten Dishes */}
      <Card>
        <CardHeader>
          <CardTitle>Lieblings-Gerichte</CardTitle>
          <CardDescription>
            {menuItems.length} Gericht{menuItems.length !== 1 ? "e" : ""} als
            Favoriten markiert
          </CardDescription>
        </CardHeader>
        <CardContent>
          {menuItems.length === 0 ? (
            <div className="flex items-center justify-center py-8 text-muted-foreground">
              Keine Gericht-Favoriten gespeichert
            </div>
          ) : (
            <div className="space-y-3">
              {menuItems.map((item) => (
                <div
                  key={item.id}
                  className="flex items-start justify-between gap-3 rounded-lg border border-border/60 bg-card/70 p-4"
                >
                  <div className="flex-1 space-y-2">
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold text-foreground">
                        {item.dishName}
                      </h3>
                      <Badge variant="outline">{item.category}</Badge>
                    </div>
                    <div className="text-sm text-muted-foreground">
                      von{" "}
                      <span className="font-medium text-foreground">
                        {item.restaurantName}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <span className="font-semibold text-primary">
                        €{item.price}
                      </span>
                      <Badge variant="secondary" className="text-xs">
                        {item.type}
                      </Badge>
                    </div>
                  </div>
                  <FavoriteButton
                    userId={userId}
                    menuItemId={item.id}
                    isFavorited={true}
                  />
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
