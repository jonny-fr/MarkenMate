"use client";

import { Suspense, type CSSProperties, useState } from "react";

import { AppSidebar } from "@/components/app-sidebar";
import { ChartAreaInteractive } from "@/components/chart-area-interactive";
import { SectionCards } from "@/components/section-cards";
import { SiteHeader } from "@/components/site-header";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import {
  type LendingUser,
  TokenLendingPanel,
} from "./_components/token-lending-panel";
import { RestaurantsView } from "./_components/restaurants-view";
import { StatsView, type StatsData, type GraphDataPoint } from "./_components/stats-view";
import { HistoryView, type HistoryItem } from "./_components/history-view";
import type { Restaurant } from "./_components/restaurants-view";

const restaurantsPromise: Promise<Restaurant[]> = Promise.resolve([
  {
    id: "pasta-loft",
    name: "Pasta Loft",
    cuisine: "Italienisch · Frische Pasta",
    address: "Innenstadt · Musterstraße 12",
    rating: 4.7,
    isOpen: true,
    dishes: [
      {
        id: "pl-1",
        name: "Trüffel Tagliatelle",
        priceEuro: "€11,90",
        priceTokens: 3,
      },
      {
        id: "pl-2",
        name: "Ofenlasagne",
        priceEuro: "€9,50",
        priceTokens: 2,
      },
      {
        id: "pl-3",
        name: "Burrata Bowl",
        priceEuro: "€10,40",
        priceTokens: 2,
      },
    ],
  },
  {
    id: "green-bowl",
    name: "Green Bowl",
    cuisine: "Bowls & Salate",
    address: "Campus Mitte · Kantinenhof",
    rating: 4.5,
    isOpen: true,
    dishes: [
      {
        id: "gb-1",
        name: "Protein Power Bowl",
        priceEuro: "€8,90",
        priceTokens: 2,
      },
      {
        id: "gb-2",
        name: "Falafel Salad",
        priceEuro: "€7,80",
        priceTokens: 2,
      },
      {
        id: "gb-3",
        name: "Seasonal Smoothie",
        priceEuro: "€4,70",
        priceTokens: 1,
      },
    ],
  },
  {
    id: "burger-werk",
    name: "Burger Werk",
    cuisine: "Burger & Streetfood",
    address: "Foodcourt · Werkstraße 8",
    rating: 4.3,
    isOpen: false,
    dishes: [
      {
        id: "bw-1",
        name: "MarkenMate Signature Burger",
        priceEuro: "€10,90",
        priceTokens: 3,
      },
      {
        id: "bw-2",
        name: "Loaded Sweet Fries",
        priceEuro: "€5,20",
        priceTokens: 1,
      },
      {
        id: "bw-3",
        name: "Spicy Veggie Burger",
        priceEuro: "€9,30",
        priceTokens: 2,
      },
    ],
  },
  {
    id: "noon-deli",
    name: "Noon Deli",
    cuisine: "Schnelle Mittagssnacks",
    address: "City Gate · Lobby West",
    rating: 4.1,
    isOpen: true,
    dishes: [
      {
        id: "nd-1",
        name: "Ciabatta Caprese",
        priceEuro: "€6,40",
        priceTokens: 1,
      },
      {
        id: "nd-2",
        name: "Tagesuppe",
        priceEuro: "€4,80",
        priceTokens: 1,
      },
      {
        id: "nd-3",
        name: "Panna Cotta",
        priceEuro: "€3,60",
        priceTokens: 1,
      },
    ],
  },
]);

const lendingPromise: Promise<LendingUser[]> = Promise.resolve([
  {
    id: "lena-graf",
    name: "Lena Graf",
    balance: 4,
    note: "Benötigt Marken für Team Lunch am Mittwoch.",
  },
  {
    id: "amir-safar",
    name: "Amir Safar",
    balance: 2,
    note: "Gleicht Freitag nach der Schicht aus.",
  },
  {
    id: "selina-wolf",
    name: "Selina Wolf",
    balance: 6,
    note: "Vergütung geplant zum Monatsende.",
  },
]);

const statsPromise: Promise<StatsData> = Promise.resolve({
  lastMonthSpent: 245.50,
  totalLendingBalance: 12,
  spendingTrend: 8.5,
});

const graphDataPromise: Promise<GraphDataPoint[]> = Promise.resolve([
  { date: "2025-09-23", spent: 45, lent: 2 },
  { date: "2025-09-24", spent: 52, lent: 1 },
  { date: "2025-09-25", spent: 38, lent: 3 },
  { date: "2025-09-26", spent: 61, lent: 2 },
  { date: "2025-09-27", spent: 48, lent: 1 },
  { date: "2025-09-28", spent: 55, lent: 2 },
  { date: "2025-09-29", spent: 42, lent: 0 },
  { date: "2025-09-30", spent: 58, lent: 1 },
]);

// Daten für 1 Monat (September 2025)
const graphDataMonth: Promise<GraphDataPoint[]> = Promise.resolve([
  { date: "2025-09-01", spent: 42, lent: 1 },
  { date: "2025-09-02", spent: 38, lent: 2 },
  { date: "2025-09-03", spent: 55, lent: 1 },
  { date: "2025-09-04", spent: 61, lent: 3 },
  { date: "2025-09-05", spent: 48, lent: 2 },
  { date: "2025-09-06", spent: 52, lent: 1 },
  { date: "2025-09-07", spent: 45, lent: 2 },
  { date: "2025-09-08", spent: 58, lent: 1 },
  { date: "2025-09-09", spent: 65, lent: 3 },
  { date: "2025-09-10", spent: 44, lent: 2 },
  { date: "2025-09-11", spent: 51, lent: 1 },
  { date: "2025-09-12", spent: 47, lent: 2 },
  { date: "2025-09-13", spent: 63, lent: 2 },
  { date: "2025-09-14", spent: 52, lent: 1 },
  { date: "2025-09-15", spent: 59, lent: 3 },
  { date: "2025-09-16", spent: 48, lent: 2 },
  { date: "2025-09-17", spent: 55, lent: 1 },
  { date: "2025-09-18", spent: 68, lent: 2 },
  { date: "2025-09-19", spent: 41, lent: 1 },
  { date: "2025-09-20", spent: 57, lent: 3 },
  { date: "2025-09-21", spent: 53, lent: 2 },
  { date: "2025-09-22", spent: 46, lent: 1 },
  { date: "2025-09-23", spent: 45, lent: 2 },
  { date: "2025-09-24", spent: 52, lent: 1 },
  { date: "2025-09-25", spent: 38, lent: 3 },
  { date: "2025-09-26", spent: 61, lent: 2 },
  { date: "2025-09-27", spent: 48, lent: 1 },
  { date: "2025-09-28", spent: 55, lent: 2 },
  { date: "2025-09-29", spent: 42, lent: 0 },
  { date: "2025-09-30", spent: 58, lent: 1 },
]);

// Daten für 3 Monate (Juli - September 2025)
const graphDataQuarter: Promise<GraphDataPoint[]> = Promise.resolve([
  // Juli
  { date: "2025-07-01", spent: 55, lent: 2 },
  { date: "2025-07-05", spent: 62, lent: 1 },
  { date: "2025-07-10", spent: 48, lent: 3 },
  { date: "2025-07-15", spent: 71, lent: 2 },
  { date: "2025-07-20", spent: 59, lent: 1 },
  { date: "2025-07-25", spent: 45, lent: 2 },
  { date: "2025-07-31", spent: 68, lent: 1 },
  // August
  { date: "2025-08-05", spent: 52, lent: 2 },
  { date: "2025-08-10", spent: 58, lent: 1 },
  { date: "2025-08-15", spent: 46, lent: 3 },
  { date: "2025-08-20", spent: 64, lent: 2 },
  { date: "2025-08-25", spent: 51, lent: 1 },
  { date: "2025-08-31", spent: 57, lent: 2 },
  // September
  { date: "2025-09-05", spent: 48, lent: 2 },
  { date: "2025-09-10", spent: 44, lent: 2 },
  { date: "2025-09-15", spent: 59, lent: 3 },
  { date: "2025-09-20", spent: 57, lent: 3 },
  { date: "2025-09-25", spent: 38, lent: 3 },
  { date: "2025-09-30", spent: 58, lent: 1 },
]);

// Daten für 1 Jahr (alle 12 Monate 2025)
const graphDataYear: Promise<GraphDataPoint[]> = Promise.resolve([
  // Januar
  { date: "2025-01-15", spent: 58, lent: 2 },
  // Februar
  { date: "2025-02-14", spent: 51, lent: 1 },
  // März
  { date: "2025-03-15", spent: 63, lent: 2 },
  // April
  { date: "2025-04-15", spent: 55, lent: 3 },
  // Mai
  { date: "2025-05-15", spent: 72, lent: 2 },
  // Juni
  { date: "2025-06-15", spent: 48, lent: 1 },
  // Juli
  { date: "2025-07-15", spent: 71, lent: 2 },
  // August
  { date: "2025-08-15", spent: 46, lent: 3 },
  // September
  { date: "2025-09-15", spent: 59, lent: 3 },
  // Oktober
  { date: "2025-10-15", spent: 65, lent: 2 },
  // November
  { date: "2025-11-15", spent: 52, lent: 1 },
  // Dezember
  { date: "2025-12-15", spent: 78, lent: 4 },
]);

// History Daten
const historyPromise: Promise<HistoryItem[]> = Promise.resolve([
  // Diese Woche (aktuelle Woche)
  {
    id: "h1",
    date: "2025-10-23",
    restaurant: "Pasta Loft",
    totalPrice: 23.80,
    items: [
      { id: "i1", name: "Trüffel Tagliatelle", price: 11.90, quantity: 1 },
      { id: "i2", name: "Ofenlasagne", price: 9.50, quantity: 1 },
      { id: "i3", name: "Wasser", price: 2.40, quantity: 1 },
    ],
  },
  {
    id: "h2",
    date: "2025-10-22",
    restaurant: "Green Bowl",
    totalPrice: 17.60,
    items: [
      { id: "i4", name: "Protein Power Bowl", price: 8.90, quantity: 1 },
      { id: "i5", name: "Seasonal Smoothie", price: 4.70, quantity: 2 },
    ],
  },
  {
    id: "h3",
    date: "2025-10-21",
    restaurant: "Burger Werk",
    totalPrice: 16.10,
    items: [
      { id: "i6", name: "MarkenMate Signature Burger", price: 10.90, quantity: 1 },
      { id: "i7", name: "Loaded Sweet Fries", price: 5.20, quantity: 1 },
    ],
  },
  // Letzte Woche
  {
    id: "h4",
    date: "2025-10-16",
    restaurant: "Noon Deli",
    totalPrice: 14.20,
    items: [
      { id: "i8", name: "Ciabatta Caprese", price: 6.40, quantity: 1 },
      { id: "i9", name: "Tagesuppe", price: 4.80, quantity: 1 },
      { id: "i10", name: "Panna Cotta", price: 3.00, quantity: 1 },
    ],
  },
  {
    id: "h5",
    date: "2025-10-14",
    restaurant: "Pasta Loft",
    totalPrice: 31.90,
    items: [
      { id: "i11", name: "Trüffel Tagliatelle", price: 11.90, quantity: 2 },
      { id: "i12", name: "Burrata Bowl", price: 10.40, quantity: 1 },
      { id: "i13", name: "Wasser", price: 2.40, quantity: 2 },
    ],
  },
  {
    id: "h6",
    date: "2025-10-12",
    restaurant: "Green Bowl",
    totalPrice: 21.40,
    items: [
      { id: "i14", name: "Falafel Salad", price: 7.80, quantity: 1 },
      { id: "i15", name: "Protein Power Bowl", price: 8.90, quantity: 1 },
      { id: "i16", name: "Seasonal Smoothie", price: 4.70, quantity: 1 },
    ],
  },
  // Weitere (älter)
  {
    id: "h7",
    date: "2025-10-05",
    restaurant: "Burger Werk",
    totalPrice: 26.00,
    items: [
      { id: "i17", name: "MarkenMate Signature Burger", price: 10.90, quantity: 2 },
      { id: "i18", name: "Loaded Sweet Fries", price: 5.20, quantity: 2 },
    ],
  },
  {
    id: "h8",
    date: "2025-09-28",
    restaurant: "Noon Deli",
    totalPrice: 18.60,
    items: [
      { id: "i19", name: "Ciabatta Caprese", price: 6.40, quantity: 2 },
      { id: "i20", name: "Tagesuppe", price: 4.80, quantity: 1 },
    ],
  },
  {
    id: "h9",
    date: "2025-09-20",
    restaurant: "Pasta Loft",
    totalPrice: 25.70,
    items: [
      { id: "i21", name: "Trüffel Tagliatelle", price: 11.90, quantity: 1 },
      { id: "i22", name: "Ofenlasagne", price: 9.50, quantity: 1 },
      { id: "i23", name: "Burrata Bowl", price: 10.40, quantity: 0.5 },
    ],
  },
  {
    id: "h10",
    date: "2025-09-10",
    restaurant: "Green Bowl",
    totalPrice: 20.30,
    items: [
      { id: "i24", name: "Protein Power Bowl", price: 8.90, quantity: 2 },
      { id: "i25", name: "Seasonal Smoothie", price: 4.70, quantity: 1 },
      { id: "i26", name: "Falafel Salad", price: 7.80, quantity: 0.5 },
    ],
  },
]);

function LoadingCard({ label }: { label: string }) {
  return (
    <div className="rounded-xl border border-dashed border-border/60 bg-muted/30 px-4 py-16 text-center text-sm text-muted-foreground">
      {label} werden geladen...
    </div>
  );
}

type ViewType = "dashboard" | "restaurants" | "stats" | "history" | "comparison" | "lending";

export default function Page() {
  const [currentView, setCurrentView] = useState<ViewType>("dashboard");

  return (
    <SidebarProvider
      style={
        {
          "--sidebar-width": "calc(var(--spacing) * 72)",
          "--header-height": "calc(var(--spacing) * 12)",
        } as CSSProperties
      }
    >
      <AppSidebar variant="inset" onNavigateAction={setCurrentView} />
      <SidebarInset>
        <SiteHeader />
        <div className="flex flex-1 flex-col">
          <div className="@container/main flex flex-1 flex-col gap-2">
            <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
              {currentView === "restaurants" ? (
                <div className="px-4 lg:px-6">
                  <Suspense fallback={<LoadingCard label="Restaurants" />}>
                    <RestaurantsView dataPromise={restaurantsPromise} />
                  </Suspense>
                </div>
              ) : currentView === "stats" ? (
                <div className="px-4 lg:px-6">
                  <Suspense fallback={<LoadingCard label="Stats" />}>
                    <StatsView
                      statsPromise={statsPromise}
                      graphDataPromise={graphDataPromise}
                      graphDataMonth={graphDataMonth}
                      graphDataQuarter={graphDataQuarter}
                      graphDataYear={graphDataYear}
                    />
                  </Suspense>
                </div>
              ) : currentView === "history" ? (
                <div className="px-4 lg:px-6">
                  <Suspense fallback={<LoadingCard label="History" />}>
                    <HistoryView dataPromise={historyPromise} />
                  </Suspense>
                </div>
              ) : (
                <>
                  <SectionCards />
                  <div className="grid gap-4 px-4 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)] lg:px-6">
                    <div className="space-y-4">
                      <ChartAreaInteractive />
                    </div>
                    <div className="space-y-4">
                      <Suspense fallback={<LoadingCard label="Markenleihen" />}>
                        <TokenLendingPanel dataPromise={lendingPromise} />
                      </Suspense>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}