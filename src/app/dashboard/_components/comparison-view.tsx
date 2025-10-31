"use client";

import { use, useMemo, useState } from "react";
import { Plus, X } from "lucide-react";
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

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

export type ComparisonDataPoint = {
  date: string;
  [key: string]: string | number;
};

const COLORS = [
  "#3b82f6",
  "#10b981",
  "#f59e0b",
  "#ef4444",
  "#8b5cf6",
  "#ec4899",
];

export function ComparisonView({
  restaurantsPromise,
  comparisonDataSpending,
  comparisonDataFrequency,
  comparisonDataAvgPrice,
}: {
  restaurantsPromise: Promise<Restaurant[]>;
  comparisonDataSpending: Promise<ComparisonDataPoint[]>;
  comparisonDataFrequency: Promise<ComparisonDataPoint[]>;
  comparisonDataAvgPrice: Promise<ComparisonDataPoint[]>;
}) {
  const restaurants = use(restaurantsPromise);
  const spendingData = use(comparisonDataSpending);
  const frequencyData = use(comparisonDataFrequency);
  const avgPriceData = use(comparisonDataAvgPrice);

  const [selectedRestaurants, setSelectedRestaurants] = useState<string[]>([
    restaurants[0]?.id || "",
  ]);
  const [category, setCategory] = useState("spending");
  const [timeInterval, setTimeInterval] = useState("month");

  // Wähle den richtigen Datensatz basierend auf der Kategorie
  const getComparisonData = () => {
    switch (category) {
      case "spending":
        return spendingData;
      case "frequency":
        return frequencyData;
      case "avgPrice":
        return avgPriceData;
      default:
        return spendingData;
    }
  };

  // Get data based on category
  const getTransformedData = (data: ComparisonDataPoint[]) => {
    return data.map((point) => {
      const transformed: any = { date: point.date };

      selectedRestaurants.forEach((restaurantId) => {
        // Verwende die Daten direkt ohne Transformation
        transformed[restaurantId] = point[restaurantId] as number;
      });

      return transformed;
    });
  };

  // Get data based on time interval
  const getIntervalData = () => {
    const comparisonData = getComparisonData();
    const now = new Date("2025-10-23");

    switch (timeInterval) {
      case "week":
        // Letzte 7 Tage: 17.10 - 23.10
        return comparisonData.filter((point) => {
          const date = new Date(point.date as string);
          return date >= new Date("2025-10-17") && date <= now;
        });
      case "month":
        // September 2025
        return comparisonData.filter((point) => {
          const date = new Date(point.date as string);
          return (
            date >= new Date("2025-09-01") && date <= new Date("2025-09-30")
          );
        });
      case "quarter":
        // Juli - September 2025
        return comparisonData.filter((point) => {
          const date = new Date(point.date as string);
          return (
            date >= new Date("2025-07-01") && date <= new Date("2025-09-30")
          );
        });
      case "year":
        // Alle 12 Monate 2025
        return comparisonData.filter((point) => {
          const date = new Date(point.date as string);
          return (
            date >= new Date("2025-01-01") && date <= new Date("2025-12-31")
          );
        });
      default:
        return comparisonData;
    }
  };

  const chartData = useMemo(() => {
    const intervalData = getIntervalData();
    const transformedData = getTransformedData(intervalData);

    return transformedData.map((point) => ({
      ...point,
      dateShort: new Date(point.date as string).toLocaleDateString("de-DE", {
        month: "short",
        day: "numeric",
      }),
    }));
  }, [timeInterval, category, selectedRestaurants]);

  const addRestaurant = (restaurantId: string) => {
    if (!selectedRestaurants.includes(restaurantId)) {
      setSelectedRestaurants([...selectedRestaurants, restaurantId]);
    }
  };

  const removeRestaurant = (restaurantId: string) => {
    if (selectedRestaurants.length > 1) {
      setSelectedRestaurants(
        selectedRestaurants.filter((id) => id !== restaurantId),
      );
    }
  };

  const getRestaurantName = (id: string) => {
    return restaurants.find((r) => r.id === id)?.name || "Unknown";
  };

  const availableRestaurants = restaurants.filter(
    (r) => !selectedRestaurants.includes(r.id),
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">
          Restaurant-Vergleich
        </h1>
      </div>

      {/* Graph Section */}
      <Card>
        <CardHeader>
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <CardTitle>Vergleichsgraph</CardTitle>
              <CardDescription>
                Vergleiche die Ausgaben und Häufigkeit zwischen Restaurants
              </CardDescription>
            </div>
            <div className="flex gap-3 flex-col sm:flex-row">
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger className="w-full sm:w-[180px]">
                  <SelectValue placeholder="Kategorie" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="spending">Ausgaben</SelectItem>
                  <SelectItem value="frequency">Häufigkeit</SelectItem>
                  <SelectItem value="avgPrice">Durchschnittspreis</SelectItem>
                </SelectContent>
              </Select>
              <Select value={timeInterval} onValueChange={setTimeInterval}>
                <SelectTrigger className="w-full sm:w-[180px]">
                  <SelectValue placeholder="Zeitraum" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="week">1 Woche</SelectItem>
                  <SelectItem value="month">1 Monat</SelectItem>
                  <SelectItem value="quarter">3 Monate</SelectItem>
                  <SelectItem value="year">1 Jahr</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="h-[400px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="dateShort" />
                <YAxis />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "var(--background)",
                    border: "1px solid var(--border)",
                    borderRadius: "0.5rem",
                  }}
                  labelStyle={{ color: "var(--foreground)" }}
                />
                <Legend />
                {selectedRestaurants.map((restaurantId, index) => (
                  <Line
                    key={restaurantId}
                    type="monotone"
                    dataKey={restaurantId}
                    stroke={COLORS[index % COLORS.length]}
                    name={getRestaurantName(restaurantId)}
                    strokeWidth={2}
                    dot={{ r: 4 }}
                  />
                ))}
              </LineChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Restaurant Selection Section */}
      <Card>
        <CardHeader>
          <CardTitle>Zu vergleichende Restaurants</CardTitle>
          <CardDescription>
            Wähle die Restaurants aus, die du vergleichen möchtest
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Selected Restaurants */}
          <div className="space-y-3">
            {selectedRestaurants.map((restaurantId, index) => (
              <div
                key={restaurantId}
                className="flex items-center justify-between rounded-lg border border-border/60 bg-card/70 p-3"
              >
                <div className="flex items-center gap-3">
                  <div
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: COLORS[index % COLORS.length] }}
                  />
                  <div className="flex flex-col">
                    <span className="font-medium text-foreground">
                      {getRestaurantName(restaurantId)}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {restaurants.find((r) => r.id === restaurantId)?.cuisine}
                    </span>
                  </div>
                </div>

                {selectedRestaurants.length > 1 && (
                  <Button
                    type="button"
                    size="icon"
                    variant="ghost"
                    className="size-8 text-destructive hover:text-destructive"
                    onClick={() => removeRestaurant(restaurantId)}
                  >
                    <X className="size-4" />
                  </Button>
                )}
              </div>
            ))}
          </div>

          {/* Add Restaurant Button */}
          {availableRestaurants.length > 0 && (
            <div className="pt-3 border-t border-border/60">
              <Select onValueChange={addRestaurant} value="">
                <SelectTrigger className="w-full">
                  <div className="flex items-center gap-2">
                    <Plus className="size-4" />
                    <SelectValue placeholder="Restaurant hinzufügen" />
                  </div>
                </SelectTrigger>
                <SelectContent>
                  {availableRestaurants.map((restaurant) => (
                    <SelectItem key={restaurant.id} value={restaurant.id}>
                      <div className="flex items-center gap-2">
                        <span>{restaurant.name}</span>
                        <Badge variant="secondary" className="ml-2">
                          {restaurant.rating.toFixed(1)} ⭐
                        </Badge>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* All Restaurants Selected Message */}
          {availableRestaurants.length === 0 &&
            selectedRestaurants.length > 1 && (
              <div className="p-3 rounded-lg bg-muted/50 text-center text-sm text-muted-foreground">
                Alle Restaurants werden bereits verglichen
              </div>
            )}
        </CardContent>
      </Card>
    </div>
  );
}
