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
  const restaurantsPromise = getRestaurants(userId);
  const lendingPromise = getLendingData(userId);
  const historyPromise = getHistoryData(userId);

  // Compute stats and graph data from database
  const statsPromise = getStatsData(userId);
  const graphDataPromise = getGraphDataWeek(userId);
  const graphDataMonth = getGraphDataMonth(userId);
  const graphDataQuarter = getGraphDataQuarter(userId);
  const graphDataYear = getGraphDataYear(userId);

  // Compute comparison data from database
  const comparisonDataSpending = getComparisonDataSpending(userId);
  const comparisonDataFrequency = getComparisonDataFrequency(userId);
  const comparisonDataAvgPrice = getComparisonDataAvgPrice(userId);

  // Fetch favorites and tickets
  const favoritesPromise = getUserFavorites(userId);
  const ticketsPromise = getUserTickets();

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
