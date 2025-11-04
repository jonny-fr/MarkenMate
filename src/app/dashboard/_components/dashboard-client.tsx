"use client";

import { Suspense, type CSSProperties, useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import { AppSidebar } from "@/components/app-sidebar";
import { ChartAreaInteractive } from "@/components/chart-area-interactive";
import { SectionCards } from "@/components/section-cards";
import { SiteHeader } from "@/components/site-header";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { type LendingUser, TokenLendingPanel } from "./token-lending-panel";
import { LendingView } from "./lending-view";
import { RestaurantsView } from "./restaurants-view";
import { ComparisonView, type ComparisonDataPoint } from "./comparison-view";
import { StatsView, type StatsData, type GraphDataPoint } from "./stats-view";
import { HistoryView, type HistoryItem } from "./history-view";
import { FavoritesView } from "./favorites-view";
import { TicketsView } from "./tickets-view";
import type { Restaurant } from "./restaurants-view";
import type { FavoriteRestaurant, FavoriteMenuItem } from "./favorites-view";

function LoadingCard({ label }: { label: string }) {
  return (
    <div className="rounded-xl border border-dashed border-border/60 bg-muted/30 px-4 py-16 text-center text-sm text-muted-foreground">
      {label} werden geladen...
    </div>
  );
}

type ViewType =
  | "dashboard"
  | "restaurants"
  | "stats"
  | "history"
  | "comparison"
  | "lending"
  | "favorites"
  | "tickets";

interface DashboardClientProps {
  userId: string;
  userRole: "user" | "admin";
  restaurantsPromise: Promise<Restaurant[]>;
  lendingPromise: Promise<LendingUser[]>;
  statsPromise: Promise<StatsData>;
  graphDataPromise: Promise<GraphDataPoint[]>;
  graphDataMonth: Promise<GraphDataPoint[]>;
  graphDataQuarter: Promise<GraphDataPoint[]>;
  graphDataYear: Promise<GraphDataPoint[]>;
  historyPromise: Promise<HistoryItem[]>;
  comparisonDataSpending: Promise<ComparisonDataPoint[]>;
  comparisonDataFrequency: Promise<ComparisonDataPoint[]>;
  comparisonDataAvgPrice: Promise<ComparisonDataPoint[]>;
  favoritesPromise: Promise<{
    restaurants: FavoriteRestaurant[];
    menuItems: FavoriteMenuItem[];
  }>;
  ticketsPromise: Promise<{
    success: boolean;
    tickets?: Array<{
      id: number;
      title: string;
      description: string;
      status: "open" | "in_progress" | "closed";
      priority: "low" | "medium" | "high" | "urgent";
      createdAt: Date;
    }>;
    error?: string;
  }>;
}

export function DashboardClient({
  userId,
  userRole,
  restaurantsPromise,
  lendingPromise,
  statsPromise,
  graphDataPromise,
  graphDataMonth,
  graphDataQuarter,
  graphDataYear,
  historyPromise,
  comparisonDataSpending,
  comparisonDataFrequency,
  comparisonDataAvgPrice,
  favoritesPromise,
  ticketsPromise,
}: DashboardClientProps) {
  const [currentView, setCurrentView] = useState<ViewType>("dashboard");
  const [refreshKey, setRefreshKey] = useState(0);
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  // PRODUCTION-READY refresh function using Next.js router.refresh()
  // This forces Next.js to re-fetch all Server Components and update the UI
  // We also increment refreshKey to force re-render of components with new data
  const handleRefresh = () => {
    startTransition(() => {
      setRefreshKey((prev) => prev + 1);
      router.refresh();
    });
  };

  return (
    <SidebarProvider
      style={
        {
          "--sidebar-width": "calc(var(--spacing) * 72)",
          "--header-height": "calc(var(--spacing) * 12)",
        } as CSSProperties
      }
    >
      <AppSidebar
        variant="inset"
        onNavigateAction={setCurrentView}
        userRole={userRole}
      />
      <SidebarInset>
        <SiteHeader />
        <div className="flex flex-1 flex-col">
          <div className="@container/main flex flex-1 flex-col gap-2">
            <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
              {currentView === "restaurants" ? (
                <div className="px-4 lg:px-6">
                  <Suspense fallback={<LoadingCard label="Restaurants" />}>
                    <RestaurantsView
                      userId={userId}
                      dataPromise={restaurantsPromise}
                    />
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
              ) : currentView === "lending" ? (
                <div className="px-4 lg:px-6">
                  <Suspense key={`lending-${refreshKey}`} fallback={<LoadingCard label="Markenleihen" />}>
                    <LendingView key={`lending-view-${refreshKey}`} userId={userId} dataPromise={lendingPromise} onRefresh={handleRefresh} />
                  </Suspense>
                </div>
              ) : currentView === "favorites" ? (
                <div className="px-4 lg:px-6">
                  <Suspense fallback={<LoadingCard label="Favoriten" />}>
                    <FavoritesView
                      userId={userId}
                      dataPromise={favoritesPromise}
                    />
                  </Suspense>
                </div>
              ) : currentView === "tickets" ? (
                <div className="px-4 lg:px-6">
                  <Suspense fallback={<LoadingCard label="Tickets" />}>
                    <TicketsView ticketsPromise={ticketsPromise} />
                  </Suspense>
                </div>
              ) : currentView === "comparison" ? (
                <div className="px-4 lg:px-6">
                  <Suspense fallback={<LoadingCard label="Vergleich" />}>
                    <ComparisonView
                      restaurantsPromise={restaurantsPromise}
                      comparisonDataSpending={comparisonDataSpending}
                      comparisonDataFrequency={comparisonDataFrequency}
                      comparisonDataAvgPrice={comparisonDataAvgPrice}
                    />
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
                      <Suspense key={`lending-panel-${refreshKey}`} fallback={<LoadingCard label="Markenleihen" />}>
                        <TokenLendingPanel
                          key={`lending-panel-view-${refreshKey}`}
                          userId={userId}
                          dataPromise={lendingPromise}
                          onRefresh={handleRefresh}
                        />
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
