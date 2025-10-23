import { Suspense, type CSSProperties } from "react";

import { AppSidebar } from "@/components/app-sidebar";
import { ChartAreaInteractive } from "@/components/chart-area-interactive";
import { SectionCards } from "@/components/section-cards";
import { SiteHeader } from "@/components/site-header";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import {
  type GeneralInfo,
  GeneralInfoPanel,
} from "./_components/general-info-panel";
import {
  type LendingUser,
  TokenLendingPanel,
} from "./_components/token-lending-panel";
import {
  type Restaurant,
  RestaurantDirectory,
} from "./_components/restaurant-directory";

const restaurantsPromise: Promise<Restaurant[]> = Promise.resolve([
  {
    id: "pasta-loft",
    name: "Pasta Loft",
    cuisine: "Italienisch · Frische Pasta",
    address: "Innenstadt · Musterstraße 12",
    rating: 4.7,
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

const generalInfoPromise: Promise<GeneralInfo> = Promise.resolve({
  location: "Essensausgabe · Campus Nord, Gebäude B2, Erdgeschoss",
  openingHours: [
    { day: "Montag", hours: "11:30 – 14:30" },
    { day: "Dienstag", hours: "11:30 – 14:30" },
    { day: "Mittwoch", hours: "11:30 – 14:30" },
    { day: "Donnerstag", hours: "11:30 – 14:30" },
    { day: "Freitag", hours: "11:30 – 14:00" },
  ],
  contact: {
    phone: "+49 30 123 45 67",
    email: "support@markenmate.de",
  },
  notes: [
    "Neue Essensmarken werden montags um 09:00 Uhr ausgegeben.",
    "Restaurant-Partner aktualisieren ihre Menüs jeweils am Freitagabend.",
    "Feiertagsöffnungszeiten werden zwei Wochen im Voraus angekündigt.",
  ],
});

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

function LoadingCard({ label }: { label: string }) {
  return (
    <div className="rounded-xl border border-dashed border-border/60 bg-muted/30 px-4 py-16 text-center text-sm text-muted-foreground">
      {label} werden geladen...
    </div>
  );
}

export default function Page() {
  return (
    <SidebarProvider
      style={
        {
          "--sidebar-width": "calc(var(--spacing) * 72)",
          "--header-height": "calc(var(--spacing) * 12)",
        } as CSSProperties
      }
    >
      <AppSidebar variant="inset" />
      <SidebarInset>
        <SiteHeader />
        <div className="flex flex-1 flex-col">
          <div className="@container/main flex flex-1 flex-col gap-2">
            <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
              <SectionCards />
              <div className="grid gap-4 px-4 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)] lg:px-6">
                <div className="space-y-4">
                  <ChartAreaInteractive />
                  <Suspense fallback={<LoadingCard label="Restaurants" />}>
                    <RestaurantDirectory dataPromise={restaurantsPromise} />
                  </Suspense>
                </div>
                <div className="space-y-4">
                  <Suspense fallback={<LoadingCard label="Allgemeine Infos" />}>
                    <GeneralInfoPanel dataPromise={generalInfoPromise} />
                  </Suspense>
                  <Suspense fallback={<LoadingCard label="Markenleihen" />}>
                    <TokenLendingPanel dataPromise={lendingPromise} />
                  </Suspense>
                </div>
              </div>
            </div>
          </div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
