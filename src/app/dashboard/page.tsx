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
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
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
import { getUserFavorites } from "@/actions/get-user-favorites";
import { getUserTickets } from "@/actions/tickets";
import { DashboardClient } from "./_components/dashboard-client";

// Force dynamic rendering since this page requires database access
export const dynamic = "force-dynamic";
// Disable all caching for this page - ensures fresh data on every request
export const revalidate = 0;
// Disable fetch cache - critical for production data freshness
export const fetchCache = "force-no-store";

export default async function Page() {
  // Get authenticated user
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  // Require authentication - redirect if not logged in
  if (!session?.user?.id) {
    throw new Error("Unauthorized - Please log in");
  }

  const userId = session.user.id;

  // Get user role from database
  const { db: database } = await import("@/db");
  const { user: userTable } = await import("@/db/schema");
  const { eq } = await import("drizzle-orm");

  const [userDetails] = await database
    .select({ role: userTable.role })
    .from(userTable)
    .where(eq(userTable.id, userId))
    .limit(1);

  const userRole = userDetails?.role || "user";

  // Fetch all data from database for authenticated user
  // Create fresh promises on every render to ensure router.refresh() works
  const restaurantsPromise = Promise.resolve(getRestaurants(userId));
  const lendingPromise = Promise.resolve(getLendingData(userId));
  const historyPromise = Promise.resolve(getHistoryData(userId));

  // Compute stats and graph data from database
  const statsPromise = Promise.resolve(getStatsData(userId));
  const graphDataPromise = Promise.resolve(getGraphDataWeek(userId));
  const graphDataMonth = Promise.resolve(getGraphDataMonth(userId));
  const graphDataQuarter = Promise.resolve(getGraphDataQuarter(userId));
  const graphDataYear = Promise.resolve(getGraphDataYear(userId));

  // Compute comparison data from database
  const comparisonDataSpending = Promise.resolve(
    getComparisonDataSpending(userId),
  );
  const comparisonDataFrequency = Promise.resolve(
    getComparisonDataFrequency(userId),
  );
  const comparisonDataAvgPrice = Promise.resolve(
    getComparisonDataAvgPrice(userId),
  );

  // Fetch favorites and tickets
  const favoritesPromise = Promise.resolve(getUserFavorites(userId));
  const ticketsPromise = Promise.resolve(getUserTickets());

  return (
    <DashboardClient
      userId={userId}
      userRole={userRole}
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
      favoritesPromise={favoritesPromise}
      ticketsPromise={ticketsPromise}
    />
  );
}
