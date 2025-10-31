/**
 * Dashboard Page - Server Component
 *
 * This page fetches data from the database and passes it to the DashboardClient.
 *
 * All data is now fetched and computed from the database:
 * - Restaurant data via getRestaurants() action
 * - Lending data via getLendingData() action
 * - History data via getHistoryData() action
 * - Stats data computed from order history and lending via getStatsData() action
 * - Graph data computed from order history and lending for different time periods
 * - Comparison data computed from order history by restaurant and date
 *
 * The database is automatically seeded with test data on first application start.
 * NO hardcoded data - everything comes from the database.
 */
import { getRestaurants } from "@/actions/get-restaurants";
import { getLendingData } from "@/actions/get-lending-data";
import { getHistoryData } from "@/actions/get-history-data";
import {
  getStatsData,
  getGraphDataWeek,
  getGraphDataMonth,
  getGraphDataQuarter,
  getGraphDataYear,
} from "@/actions/get-stats-data";
import {
  getComparisonDataSpending,
  getComparisonDataFrequency,
  getComparisonDataAvgPrice,
} from "@/actions/get-comparison-data";
import { DashboardClient } from "./_components/dashboard-client";
import type { Restaurant } from "./_components/restaurants-view";
import type { LendingUser } from "./_components/token-lending-panel";
import type { ComparisonDataPoint } from "./_components/comparison-view";
import type { StatsData, GraphDataPoint } from "./_components/stats-view";
import type { HistoryItem } from "./_components/history-view";

// Force dynamic rendering since this page requires database access
export const dynamic = "force-dynamic";

export default function Page() {
  // Fetch all data from database - NO hardcoded data
  const restaurantsPromise = getRestaurants();
  const lendingPromise = getLendingData();
  const historyPromise = getHistoryData();

  // Compute stats and graph data from database
  const statsPromise = getStatsData();
  const graphDataPromise = getGraphDataWeek();
  const graphDataMonth = getGraphDataMonth();
  const graphDataQuarter = getGraphDataQuarter();
  const graphDataYear = getGraphDataYear();

  // Compute comparison data from database
  const comparisonDataSpending = getComparisonDataSpending();
  const comparisonDataFrequency = getComparisonDataFrequency();
  const comparisonDataAvgPrice = getComparisonDataAvgPrice();

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
