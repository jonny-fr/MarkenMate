"use client";

import { use } from "react";
import { ChevronDown } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

export type HistoryItem = {
  id: string;
  date: string;
  restaurant: string;
  totalPrice: number;
  items: Array<{
    id: string;
    name: string;
    price: number;
    quantity: number;
  }>;
};

function TransactionCard({ item }: { item: HistoryItem }) {
  const formattedDate = new Date(item.date).toLocaleDateString("de-DE", {
    weekday: "short",
    day: "2-digit",
    month: "2-digit",
    year: "2-digit",
  });

  return (
    <details className="group rounded-lg border border-border/60 bg-card/80 p-4 transition-all open:bg-card">
      <summary className="flex cursor-pointer list-none items-center justify-between gap-3">
        <div className="space-y-1 flex-1">
          <p className="text-sm font-medium text-muted-foreground">
            {formattedDate}
          </p>
          <p className="text-base font-semibold text-foreground">
            {item.restaurant}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <p className="text-lg font-bold text-foreground">
            €{item.totalPrice.toFixed(2)}
          </p>
          <ChevronDown className="size-4 transition-transform group-open:-rotate-180" />
        </div>
      </summary>
      <div className="mt-4 space-y-2 border-t border-border/50 pt-4">
        {item.items.map((product) => (
          <div
            key={product.id}
            className="flex items-center justify-between gap-4 text-sm"
          >
            <div className="flex-1">
              <p className="font-medium text-foreground">{product.name}</p>
              <p className="text-xs text-muted-foreground">
                Menge: {product.quantity}
              </p>
            </div>
            <p className="font-semibold text-foreground">
              €{(product.price * product.quantity).toFixed(2)}
            </p>
          </div>
        ))}
      </div>
    </details>
  );
}

function HistorySection({
  title,
  items,
}: {
  title: string;
  items: HistoryItem[];
}) {
  if (items.length === 0) {
    return null;
  }

  const totalCost = items.reduce((sum, item) => sum + item.totalPrice, 0);

  return (
    <div className="space-y-4 pb-8">
      <h2 className="text-lg font-semibold text-foreground">{title}</h2>
      <div className="space-y-3">
        {items.map((item) => (
          <TransactionCard key={item.id} item={item} />
        ))}
      </div>
      <div className="pt-4 border-t border-border/40 pr-8">
        <p className="text-right text-2xl font-bold text-foreground">
          €{totalCost.toFixed(2)}
        </p>
      </div>
    </div>
  );
}

export function HistoryView({
  dataPromise,
}: {
  dataPromise: Promise<HistoryItem[]>;
}) {
  const historyData = use(dataPromise);

  // Get current date
  const today = new Date();
  const weekStart = new Date(today);
  weekStart.setDate(today.getDate() - today.getDay());

  const lastWeekStart = new Date(weekStart);
  lastWeekStart.setDate(weekStart.getDate() - 7);
  const lastWeekEnd = new Date(weekStart);
  lastWeekEnd.setDate(weekStart.getDate() - 1);

  // Categorize items
  const thisWeek = historyData.filter((item) => {
    const itemDate = new Date(item.date);
    return itemDate >= weekStart && itemDate <= today;
  });

  const lastWeek = historyData.filter((item) => {
    const itemDate = new Date(item.date);
    return itemDate >= lastWeekStart && itemDate < weekStart;
  });

  const older = historyData.filter((item) => {
    const itemDate = new Date(item.date);
    return itemDate < lastWeekStart;
  });

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-foreground">History</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Deine letzten Transaktionen
        </p>
      </div>

      {/* This Week Section */}
      <HistorySection title="Diese Woche" items={thisWeek} />

      {/* Last Week Section */}
      <HistorySection title="Letzte Woche" items={lastWeek} />

      {/* Older Section */}
      <HistorySection title="Weitere" items={older} />

      {/* Empty State */}
      {historyData.length === 0 && (
        <Card>
          <CardContent className="pt-6">
            <p className="text-center text-sm text-muted-foreground">
              Keine Transaktionen gefunden
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
