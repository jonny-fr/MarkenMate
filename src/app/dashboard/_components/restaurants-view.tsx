"use client";

import { use } from "react";
import { ChevronDown, MapPin, Star } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export type Restaurant = {
  id: string;
  name: string;
  cuisine: string;
  address: string;
  rating: number;
  isOpen: boolean;
  dishes: Array<{
    id: string;
    name: string;
    priceEuro: string;
    priceTokens: number;
  }>;
};

function RestaurantCard({ restaurant }: { restaurant: Restaurant }) {
  return (
    <details className="group rounded-lg border border-border/60 bg-card/80 p-4 transition-all open:bg-card">
      <summary className="flex cursor-pointer list-none items-start justify-between gap-3 text-left">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <p className="text-base font-semibold text-foreground">
              {restaurant.name}
            </p>
            <Badge variant="secondary" className="gap-1.5">
              <Star className="size-4 text-primary" />
              {restaurant.rating.toFixed(1)}
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground">
            {restaurant.cuisine}
          </p>
          <span className="flex items-center gap-1 text-xs text-muted-foreground">
            <MapPin className="size-4" />
            {restaurant.address}
          </span>
        </div>
        <ChevronDown className="size-4 transition-transform group-open:-rotate-180" />
      </summary>
      <div className="mt-4 space-y-3 text-sm">
        <p className="text-muted-foreground">Gerichte & Markenpreise</p>
        <ul className="space-y-2">
          {restaurant.dishes.map((dish) => (
            <li
              key={dish.id}
              className="flex items-center justify-between rounded-lg border border-border/50 bg-background/60 px-3 py-2 backdrop-blur"
            >
              <div className="flex flex-col">
                <span className="font-medium text-foreground">
                  {dish.name}
                </span>
                <span className="text-xs text-muted-foreground">
                  {dish.priceEuro}
                </span>
              </div>
              <Badge>{dish.priceTokens} Marken</Badge>
            </li>
          ))}
        </ul>
      </div>
    </details>
  );
}

export function RestaurantsView({
  dataPromise,
}: {
  dataPromise: Promise<Restaurant[]>;
}) {
  const restaurants = use(dataPromise);

  const openRestaurants = restaurants.filter((r) => r.isOpen);
  const closedRestaurants = restaurants.filter((r) => !r.isOpen);

  return (
    <div className="space-y-6">
      {/* Open Today Section */}
      <Card>
        <CardHeader>
          <CardTitle>Open today</CardTitle>
          <CardDescription>
            {openRestaurants.length} Restaurants sind geöffnet
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex max-h-[420px] flex-col gap-3 overflow-y-auto pr-2">
            {openRestaurants.length > 0 ? (
              openRestaurants.map((restaurant) => (
                <RestaurantCard
                  key={restaurant.id}
                  restaurant={restaurant}
                />
              ))
            ) : (
              <p className="text-center text-sm text-muted-foreground py-8">
                Keine offenen Restaurants heute
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Closed Today Section */}
      <Card>
        <CardHeader>
          <CardTitle>Closed today</CardTitle>
          <CardDescription>
            {closedRestaurants.length} Restaurants sind geschlossen
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex max-h-[420px] flex-col gap-3 overflow-y-auto pr-2">
            {closedRestaurants.length > 0 ? (
              closedRestaurants.map((restaurant) => (
                <RestaurantCard
                  key={restaurant.id}
                  restaurant={restaurant}
                />
              ))
            ) : (
              <p className="text-center text-sm text-muted-foreground py-8">
                Keine geschlossenen Restaurants heute
              </p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

