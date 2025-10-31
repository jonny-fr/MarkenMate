"use client";

import { use, useState } from "react";
import { ChevronDown, MapPin, Plus, Save, Star, Trash2 } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { calculateTokens } from "@/lib/token-calculator";
import { saveOrderAction, type OrderItem } from "@/actions/save-order-client";
import { toast } from "sonner";

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
    category?: string;
    type?: string;
  }>;
};

type OrderDish = {
  menuItemId: number;
  restaurantId: number;
  restaurantName: string;
  dishName: string;
  type: string;
  category: string;
  price: number;
};

function RestaurantCard({
  restaurant,
  onAddDish,
}: {
  restaurant: Restaurant;
  onAddDish: (dish: OrderDish) => void;
}) {
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
          <p className="text-sm text-muted-foreground">{restaurant.cuisine}</p>
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
          {restaurant.dishes.map((dish) => {
            const price = Number.parseFloat(
              dish.priceEuro.replace("€", "").replace(",", "."),
            );
            const tokenCalc = calculateTokens(price);

            return (
              <li
                key={dish.id}
                className="flex items-center justify-between gap-2 rounded-lg border border-border/50 bg-background/60 px-3 py-2 backdrop-blur"
              >
                <div className="flex flex-col">
                  <span className="font-medium text-foreground">
                    {dish.name}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {dish.priceEuro}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="flex flex-col items-end">
                    <Badge variant="default" className="mb-1">
                      {tokenCalc.anzahlMarken} Marken
                    </Badge>
                    <span className="text-xs font-medium text-primary">
                      Bezahlt: €
                      {tokenCalc.realGezahlt.toFixed(2).replace(".", ",")}
                    </span>
                  </div>
                  <Button
                    size="icon"
                    variant="outline"
                    onClick={() =>
                      onAddDish({
                        menuItemId: Number.parseInt(dish.id),
                        restaurantId: Number.parseInt(restaurant.id),
                        restaurantName: restaurant.name,
                        dishName: dish.name,
                        type: dish.type || "main_course",
                        category: dish.category || "general",
                        price,
                      })
                    }
                  >
                    <Plus className="size-4" />
                  </Button>
                </div>
              </li>
            );
          })}
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
  const [order, setOrder] = useState<OrderDish[]>([]);
  const [isPending, setIsPending] = useState(false);

  const openRestaurants = restaurants.filter((r) => r.isOpen);
  const closedRestaurants = restaurants.filter((r) => !r.isOpen);

  const handleAddDish = (dish: OrderDish) => {
    setOrder((prev) => [...prev, dish]);
    toast.success(`${dish.dishName} zur Bestellung hinzugefügt`);
  };

  const handleRemoveDish = (index: number) => {
    setOrder((prev) => prev.filter((_, i) => i !== index));
    toast.info("Gericht aus Bestellung entfernt");
  };

  const handleSaveOrder = async () => {
    if (order.length === 0) {
      toast.error("Bestellung ist leer");
      return;
    }

    // Group items by restaurant
    const ordersByRestaurant = order.reduce(
      (acc, item) => {
        if (!acc[item.restaurantId]) {
          acc[item.restaurantId] = [];
        }
        acc[item.restaurantId].push(item);
        return acc;
      },
      {} as Record<number, OrderDish[]>,
    );

    // If items are from multiple restaurants, show warning
    const restaurantIds = Object.keys(ordersByRestaurant);
    if (restaurantIds.length > 1) {
      toast.error("Bitte wählen Sie Gerichte nur von einem Restaurant");
      return;
    }

    setIsPending(true);

    try {
      const restaurantId = Number.parseInt(restaurantIds[0]);
      const items: OrderItem[] = order.map((dish) => ({
        menuItemId: dish.menuItemId,
        dishName: dish.dishName,
        type: dish.type,
        category: dish.category,
        price: dish.price,
      }));

      const result = await saveOrderAction({ restaurantId, items });

      if (result.success) {
        toast.success(result.message);
        setOrder([]);
      } else {
        toast.error(result.message);
      }
    } catch (error) {
      toast.error("Fehler beim Speichern der Bestellung");
      console.error(error);
    } finally {
      setIsPending(false);
    }
  };

  const orderTotal = order.reduce((sum, item) => sum + item.price, 0);
  const orderTokenCalc = order.length > 0 ? calculateTokens(orderTotal) : null;

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
                  onAddDish={handleAddDish}
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
                  onAddDish={handleAddDish}
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

      {/* Current Order Section */}
      {order.length > 0 && (
        <Card className="border-primary">
          <CardHeader>
            <CardTitle>Aktuelle Bestellung</CardTitle>
            <CardDescription>
              {order.length} Gericht{order.length !== 1 ? "e" : ""} von{" "}
              {order[0].restaurantName}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <ul className="space-y-2">
                {order.map((item, index) => {
                  const tokenCalc = calculateTokens(item.price);
                  return (
                    <li
                      key={`${item.menuItemId}-${index}`}
                      className="flex items-center justify-between gap-2 rounded-lg border border-border/50 bg-background/60 px-3 py-2"
                    >
                      <div className="flex flex-col">
                        <span className="font-medium text-foreground">
                          {item.dishName}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          €{item.price.toFixed(2).replace(".", ",")}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="flex flex-col items-end">
                          <Badge variant="secondary" className="mb-1">
                            {tokenCalc.anzahlMarken} Marken
                          </Badge>
                          <span className="text-xs text-muted-foreground">
                            Bezahlt: €
                            {tokenCalc.realGezahlt.toFixed(2).replace(".", ",")}
                          </span>
                        </div>
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => handleRemoveDish(index)}
                        >
                          <Trash2 className="size-4" />
                        </Button>
                      </div>
                    </li>
                  );
                })}
              </ul>

              {/* Order Summary */}
              {orderTokenCalc && (
                <div className="space-y-2 rounded-lg border border-primary/50 bg-primary/5 p-3">
                  <div className="flex justify-between text-sm">
                    <span className="font-medium">Gesamt:</span>
                    <span className="font-semibold">
                      €{orderTotal.toFixed(2).replace(".", ",")}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="font-medium">Benötigte Marken:</span>
                    <span className="font-semibold">
                      {orderTokenCalc.anzahlMarken}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="font-medium">Real bezahlt:</span>
                    <span className="font-semibold text-primary">
                      €{orderTokenCalc.realGezahlt.toFixed(2).replace(".", ",")}
                    </span>
                  </div>
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>Rückgeld:</span>
                    <span>
                      €{orderTokenCalc.rueckgeld.toFixed(2).replace(".", ",")}
                    </span>
                  </div>
                </div>
              )}

              {/* Save Button */}
              <Button
                className="w-full"
                onClick={handleSaveOrder}
                disabled={isPending}
              >
                <Save className="size-4" />
                {isPending ? "Wird gespeichert..." : "Bestellung speichern"}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
