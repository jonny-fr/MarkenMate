/**
 * Dashboard Page - Server Component
 *
 * This page fetches data from the database and passes it to the DashboardClient.
 * 
 * All data is now fetched from the database:
 * - Restaurant data via getRestaurants() action
 * - Lending data via getLendingData() action
 * - History data via getHistoryData() action
 * 
 * The database is automatically seeded with test data on first application start.
 * 
 * Note: Stats and comparison data are still hardcoded as UI mockups.
 * In a production app, these would be computed from aggregated order history.
 */
import { getRestaurants } from "@/actions/get-restaurants";
import { getLendingData } from "@/actions/get-lending-data";
import { getHistoryData } from "@/actions/get-history-data";
import { DashboardClient } from "./_components/dashboard-client";
import type { Restaurant } from "./_components/restaurants-view";
import type { LendingUser } from "./_components/token-lending-panel";
import type { ComparisonDataPoint } from "./_components/comparison-view";
import type { StatsData, GraphDataPoint } from "./_components/stats-view";
import type { HistoryItem } from "./_components/history-view";

// Force dynamic rendering since this page requires database access
export const dynamic = "force-dynamic";

/**
 * Hardcoded mockup data for UI demonstration.
 * Stats and comparison data would be computed from aggregated order history in production.
 */

// Comparison data - Spending (mockup - would be computed from orderHistory)
const comparisonDataSpending: Promise<ComparisonDataPoint[]> = Promise.resolve([
  // Woche
  { date: "2025-10-17", "pasta-loft": 45, "green-bowl": 35, "burger-werk": 52, "noon-deli": 28 },
  { date: "2025-10-18", "pasta-loft": 52, "green-bowl": 42, "burger-werk": 48, "noon-deli": 32 },
  { date: "2025-10-19", "pasta-loft": 48, "green-bowl": 38, "burger-werk": 61, "noon-deli": 35 },
  { date: "2025-10-20", "pasta-loft": 58, "green-bowl": 45, "burger-werk": 55, "noon-deli": 40 },
  { date: "2025-10-21", "pasta-loft": 62, "green-bowl": 52, "burger-werk": 48, "noon-deli": 38 },
  { date: "2025-10-22", "pasta-loft": 55, "green-bowl": 48, "burger-werk": 42, "noon-deli": 45 },
  { date: "2025-10-23", "pasta-loft": 68, "green-bowl": 58, "burger-werk": 52, "noon-deli": 50 },
  // Monat
  { date: "2025-09-01", "pasta-loft": 42, "green-bowl": 38, "burger-werk": 48, "noon-deli": 25 },
  { date: "2025-09-05", "pasta-loft": 55, "green-bowl": 44, "burger-werk": 52, "noon-deli": 30 },
  { date: "2025-09-10", "pasta-loft": 48, "green-bowl": 40, "burger-werk": 58, "noon-deli": 35 },
  { date: "2025-09-15", "pasta-loft": 62, "green-bowl": 52, "burger-werk": 50, "noon-deli": 38 },
  { date: "2025-09-20", "pasta-loft": 58, "green-bowl": 50, "burger-werk": 52, "noon-deli": 40 },
  { date: "2025-09-25", "pasta-loft": 65, "green-bowl": 55, "burger-werk": 48, "noon-deli": 42 },
  { date: "2025-09-30", "pasta-loft": 72, "green-bowl": 62, "burger-werk": 55, "noon-deli": 48 },
  // Quartal
  { date: "2025-07-15", "pasta-loft": 45, "green-bowl": 35, "burger-werk": 50, "noon-deli": 30 },
  { date: "2025-07-31", "pasta-loft": 52, "green-bowl": 40, "burger-werk": 48, "noon-deli": 32 },
  { date: "2025-08-15", "pasta-loft": 58, "green-bowl": 48, "burger-werk": 55, "noon-deli": 38 },
  { date: "2025-08-31", "pasta-loft": 62, "green-bowl": 52, "burger-werk": 50, "noon-deli": 42 },
  { date: "2025-09-15", "pasta-loft": 68, "green-bowl": 58, "burger-werk": 60, "noon-deli": 45 },
  { date: "2025-09-30", "pasta-loft": 75, "green-bowl": 65, "burger-werk": 55, "noon-deli": 50 },
  // Jahr
  { date: "2025-01-15", "pasta-loft": 35, "green-bowl": 28, "burger-werk": 42, "noon-deli": 22 },
  { date: "2025-02-15", "pasta-loft": 38, "green-bowl": 32, "burger-werk": 45, "noon-deli": 25 },
  { date: "2025-03-15", "pasta-loft": 42, "green-bowl": 35, "burger-werk": 48, "noon-deli": 28 },
  { date: "2025-04-15", "pasta-loft": 48, "green-bowl": 40, "burger-werk": 52, "noon-deli": 32 },
  { date: "2025-05-15", "pasta-loft": 52, "green-bowl": 45, "burger-werk": 55, "noon-deli": 35 },
  { date: "2025-06-15", "pasta-loft": 58, "green-bowl": 50, "burger-werk": 58, "noon-deli": 38 },
  { date: "2025-07-15", "pasta-loft": 62, "green-bowl": 55, "burger-werk": 62, "noon-deli": 42 },
  { date: "2025-08-15", "pasta-loft": 68, "green-bowl": 60, "burger-werk": 65, "noon-deli": 45 },
  { date: "2025-09-15", "pasta-loft": 72, "green-bowl": 65, "burger-werk": 68, "noon-deli": 48 },
  { date: "2025-10-15", "pasta-loft": 75, "green-bowl": 68, "burger-werk": 70, "noon-deli": 50 },
  { date: "2025-11-15", "pasta-loft": 78, "green-bowl": 70, "burger-werk": 72, "noon-deli": 52 },
  { date: "2025-12-15", "pasta-loft": 85, "green-bowl": 75, "burger-werk": 80, "noon-deli": 58 },
]);

// Frequency Daten (Häufigkeit - wie oft besucht)
const comparisonDataFrequency: Promise<ComparisonDataPoint[]> = Promise.resolve([
  // Woche
  { date: "2025-10-17", "pasta-loft": 3, "green-bowl": 2, "burger-werk": 4, "noon-deli": 1 },
  { date: "2025-10-18", "pasta-loft": 4, "green-bowl": 3, "burger-werk": 3, "noon-deli": 2 },
  { date: "2025-10-19", "pasta-loft": 3, "green-bowl": 2, "burger-werk": 5, "noon-deli": 2 },
  { date: "2025-10-20", "pasta-loft": 4, "green-bowl": 3, "burger-werk": 4, "noon-deli": 3 },
  { date: "2025-10-21", "pasta-loft": 5, "green-bowl": 4, "burger-werk": 3, "noon-deli": 2 },
  { date: "2025-10-22", "pasta-loft": 4, "green-bowl": 3, "burger-werk": 2, "noon-deli": 3 },
  { date: "2025-10-23", "pasta-loft": 5, "green-bowl": 4, "burger-werk": 4, "noon-deli": 3 },
  // Monat
  { date: "2025-09-01", "pasta-loft": 3, "green-bowl": 2, "burger-werk": 3, "noon-deli": 1 },
  { date: "2025-09-05", "pasta-loft": 4, "green-bowl": 3, "burger-werk": 4, "noon-deli": 2 },
  { date: "2025-09-10", "pasta-loft": 3, "green-bowl": 2, "burger-werk": 4, "noon-deli": 2 },
  { date: "2025-09-15", "pasta-loft": 5, "green-bowl": 4, "burger-werk": 3, "noon-deli": 3 },
  { date: "2025-09-20", "pasta-loft": 4, "green-bowl": 3, "burger-werk": 4, "noon-deli": 3 },
  { date: "2025-09-25", "pasta-loft": 5, "green-bowl": 4, "burger-werk": 3, "noon-deli": 2 },
  { date: "2025-09-30", "pasta-loft": 6, "green-bowl": 5, "burger-werk": 4, "noon-deli": 3 },
  // Quartal
  { date: "2025-07-15", "pasta-loft": 3, "green-bowl": 2, "burger-werk": 3, "noon-deli": 2 },
  { date: "2025-07-31", "pasta-loft": 4, "green-bowl": 3, "burger-werk": 3, "noon-deli": 2 },
  { date: "2025-08-15", "pasta-loft": 4, "green-bowl": 3, "burger-werk": 4, "noon-deli": 3 },
  { date: "2025-08-31", "pasta-loft": 5, "green-bowl": 4, "burger-werk": 3, "noon-deli": 3 },
  { date: "2025-09-15", "pasta-loft": 5, "green-bowl": 4, "burger-werk": 4, "noon-deli": 3 },
  { date: "2025-09-30", "pasta-loft": 6, "green-bowl": 5, "burger-werk": 4, "noon-deli": 3 },
  // Jahr
  { date: "2025-01-15", "pasta-loft": 2, "green-bowl": 2, "burger-werk": 2, "noon-deli": 1 },
  { date: "2025-02-15", "pasta-loft": 3, "green-bowl": 2, "burger-werk": 2, "noon-deli": 1 },
  { date: "2025-03-15", "pasta-loft": 3, "green-bowl": 2, "burger-werk": 3, "noon-deli": 2 },
  { date: "2025-04-15", "pasta-loft": 3, "green-bowl": 3, "burger-werk": 3, "noon-deli": 2 },
  { date: "2025-05-15", "pasta-loft": 4, "green-bowl": 3, "burger-werk": 3, "noon-deli": 2 },
  { date: "2025-06-15", "pasta-loft": 4, "green-bowl": 3, "burger-werk": 4, "noon-deli": 3 },
  { date: "2025-07-15", "pasta-loft": 4, "green-bowl": 4, "burger-werk": 4, "noon-deli": 3 },
  { date: "2025-08-15", "pasta-loft": 5, "green-bowl": 4, "burger-werk": 4, "noon-deli": 3 },
  { date: "2025-09-15", "pasta-loft": 5, "green-bowl": 4, "burger-werk": 4, "noon-deli": 3 },
  { date: "2025-10-15", "pasta-loft": 5, "green-bowl": 4, "burger-werk": 4, "noon-deli": 3 },
  { date: "2025-11-15", "pasta-loft": 5, "green-bowl": 5, "burger-werk": 4, "noon-deli": 3 },
  { date: "2025-12-15", "pasta-loft": 6, "green-bowl": 5, "burger-werk": 5, "noon-deli": 4 },
]);

// Average Price Daten (Durchschnittspreis pro Restaurant)
const comparisonDataAvgPrice: Promise<ComparisonDataPoint[]> = Promise.resolve([
  // Woche
  { date: "2025-10-17", "pasta-loft": 15, "green-bowl": 17.5, "burger-werk": 13, "noon-deli": 28 },
  { date: "2025-10-18", "pasta-loft": 13, "green-bowl": 14, "burger-werk": 16, "noon-deli": 16 },
  { date: "2025-10-19", "pasta-loft": 16, "green-bowl": 19, "burger-werk": 12.2, "noon-deli": 17.5 },
  { date: "2025-10-20", "pasta-loft": 14.5, "green-bowl": 15, "burger-werk": 13.75, "noon-deli": 13.3 },
  { date: "2025-10-21", "pasta-loft": 12.4, "green-bowl": 13, "burger-werk": 16, "noon-deli": 19 },
  { date: "2025-10-22", "pasta-loft": 13.75, "green-bowl": 16, "burger-werk": 21, "noon-deli": 15 },
  { date: "2025-10-23", "pasta-loft": 13.6, "green-bowl": 14.5, "burger-werk": 13, "noon-deli": 16.7 },
  // Monat
  { date: "2025-09-01", "pasta-loft": 14, "green-bowl": 19, "burger-werk": 16, "noon-deli": 25 },
  { date: "2025-09-05", "pasta-loft": 13.75, "green-bowl": 14.7, "burger-werk": 13, "noon-deli": 15 },
  { date: "2025-09-10", "pasta-loft": 16, "green-bowl": 20, "burger-werk": 14.5, "noon-deli": 17.5 },
  { date: "2025-09-15", "pasta-loft": 12.4, "green-bowl": 13, "burger-werk": 16.7, "noon-deli": 12.7 },
  { date: "2025-09-20", "pasta-loft": 14.5, "green-bowl": 16.7, "burger-werk": 13, "noon-deli": 13.3 },
  { date: "2025-09-25", "pasta-loft": 13, "green-bowl": 13.75, "burger-werk": 16, "noon-deli": 21 },
  { date: "2025-09-30", "pasta-loft": 12, "green-bowl": 12.4, "burger-werk": 13.75, "noon-deli": 16 },
  // Quartal
  { date: "2025-07-15", "pasta-loft": 15, "green-bowl": 17.5, "burger-werk": 16.7, "noon-deli": 15 },
  { date: "2025-07-31", "pasta-loft": 13, "green-bowl": 13.3, "burger-werk": 16, "noon-deli": 16 },
  { date: "2025-08-15", "pasta-loft": 14.5, "green-bowl": 16, "burger-werk": 13.75, "noon-deli": 12.7 },
  { date: "2025-08-31", "pasta-loft": 12.4, "green-bowl": 13, "burger-werk": 16.7, "noon-deli": 14 },
  { date: "2025-09-15", "pasta-loft": 13.6, "green-bowl": 14.5, "burger-werk": 15, "noon-deli": 15 },
  { date: "2025-09-30", "pasta-loft": 12.5, "green-bowl": 13, "burger-werk": 13.75, "noon-deli": 16.7 },
  // Jahr
  { date: "2025-01-15", "pasta-loft": 17.5, "green-bowl": 14, "burger-werk": 21, "noon-deli": 22 },
  { date: "2025-02-15", "pasta-loft": 12.7, "green-bowl": 16, "burger-werk": 22.5, "noon-deli": 25 },
  { date: "2025-03-15", "pasta-loft": 14, "green-bowl": 17.5, "burger-werk": 16, "noon-deli": 14 },
  { date: "2025-04-15", "pasta-loft": 16, "green-bowl": 13.3, "burger-werk": 17.3, "noon-deli": 16 },
  { date: "2025-05-15", "pasta-loft": 13, "green-bowl": 15, "burger-werk": 18.3, "noon-deli": 17.5 },
  { date: "2025-06-15", "pasta-loft": 14.5, "green-bowl": 16.7, "burger-werk": 14.5, "noon-deli": 12.7 },
  { date: "2025-07-15", "pasta-loft": 15.5, "green-bowl": 13.75, "burger-werk": 15.5, "noon-deli": 14 },
  { date: "2025-08-15", "pasta-loft": 13.6, "green-bowl": 15, "burger-werk": 16.25, "noon-deli": 15 },
  { date: "2025-09-15", "pasta-loft": 14.4, "green-bowl": 16.25, "burger-werk": 17, "noon-deli": 16 },
  { date: "2025-10-15", "pasta-loft": 15, "green-bowl": 17, "burger-werk": 17.5, "noon-deli": 16.7 },
  { date: "2025-11-15", "pasta-loft": 15.6, "green-bowl": 14, "burger-werk": 18, "noon-deli": 17.3 },
  { date: "2025-12-15", "pasta-loft": 14.2, "green-bowl": 15, "burger-werk": 16, "noon-deli": 14.5 },
]);

// Stats data (mockup - would be computed from orderHistory aggregations)
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

export default function Page() {
  // Fetch data from database
  const restaurantsPromise = getRestaurants();
  const lendingPromise = getLendingData();
  const historyPromise = getHistoryData();

  return (
    <DashboardClient
      restaurantsPromise={restaurantsPromise}
      lendingPromise={lendingPromise}
      statsPromise={statsPromise}
      graphDataPromise={graphDataPromise}
      graphDataMonth={graphDataMonth}
      graphDataQuarter={graphDataQuarter}
      graphDataYear={graphDataYear}
      historyPromise={historyPromise}
      comparisonDataSpending={comparisonDataSpending}
      comparisonDataFrequency={comparisonDataFrequency}
      comparisonDataAvgPrice={comparisonDataAvgPrice}
    />
  );
}
