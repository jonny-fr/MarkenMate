"use server";

import "server-only";
import { db } from "@/db";
import { orderHistory, tokenLending } from "@/db/schema";
import { eq, sql, and, gte } from "drizzle-orm";

export type StatsData = {
  lastMonthSpent: number;
  totalLendingBalance: number;
  spendingTrend: number;
};

export type GraphDataPoint = {
  date: string;
  spent: number;
  lent: number;
};

/**
 * Computes statistics from the database for the authenticated user.
 */
export async function getStatsData(userId: string): Promise<StatsData> {
  // Calculate last month spending
  const oneMonthAgo = new Date();
  oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);

  const lastMonthOrders = await db
    .select({
      total: sql<number>`SUM(CAST(${orderHistory.totalPrice} AS NUMERIC))`,
    })
    .from(orderHistory)
    .where(
      and(
        eq(orderHistory.userId, userId),
        gte(orderHistory.visitDate, oneMonthAgo),
      ),
    );

  const lastMonthSpent = Number(lastMonthOrders[0]?.total ?? 0);

  // Calculate two months ago spending for trend
  const twoMonthsAgo = new Date();
  twoMonthsAgo.setMonth(twoMonthsAgo.getMonth() - 2);

  const twoMonthsAgoOrders = await db
    .select({
      total: sql<number>`SUM(CAST(${orderHistory.totalPrice} AS NUMERIC))`,
    })
    .from(orderHistory)
    .where(
      and(
        eq(orderHistory.userId, userId),
        gte(orderHistory.visitDate, twoMonthsAgo),
        sql`${orderHistory.visitDate} < ${oneMonthAgo}`,
      ),
    );

  const previousMonthSpent = Number(twoMonthsAgoOrders[0]?.total ?? 0);

  // Calculate spending trend percentage
  let spendingTrend = 0;
  if (previousMonthSpent > 0) {
    spendingTrend =
      ((lastMonthSpent - previousMonthSpent) / previousMonthSpent) * 100;
  } else if (lastMonthSpent > 0) {
    spendingTrend = 100;
  }

  // Calculate total lending balance
  const lendingRecords = await db
    .select({
      total: sql<number>`SUM(${tokenLending.tokenCount})`,
    })
    .from(tokenLending)
    .where(eq(tokenLending.userId, userId));

  const totalLendingBalance = Number(lendingRecords[0]?.total ?? 0);

  return {
    lastMonthSpent: Number(lastMonthSpent.toFixed(2)),
    totalLendingBalance,
    spendingTrend: Number(spendingTrend.toFixed(1)),
  };
}

/**
 * Computes graph data (spending and lending over time) from the database.
 * Groups data by date and aggregates spending and lending counts.
 */
export async function getGraphData(
  userId: string,
  startDate: Date,
  endDate: Date,
): Promise<GraphDataPoint[]> {
  // Get spending data grouped by date
  const spendingData = await db
    .select({
      date: sql<string>`DATE(${orderHistory.visitDate})`,
      spent: sql<number>`SUM(CAST(${orderHistory.totalPrice} AS NUMERIC))`,
    })
    .from(orderHistory)
    .where(
      and(
        eq(orderHistory.userId, userId),
        gte(orderHistory.visitDate, startDate),
        sql`${orderHistory.visitDate} <= ${endDate}`,
      ),
    )
    .groupBy(sql`DATE(${orderHistory.visitDate})`)
    .orderBy(sql`DATE(${orderHistory.visitDate})`);

  // Get lending data grouped by date
  const lendingData = await db
    .select({
      date: sql<string>`DATE(${tokenLending.lastLendingDate})`,
      lent: sql<number>`COUNT(*)`,
    })
    .from(tokenLending)
    .where(
      and(
        eq(tokenLending.userId, userId),
        gte(tokenLending.lastLendingDate, startDate),
        sql`${tokenLending.lastLendingDate} <= ${endDate}`,
      ),
    )
    .groupBy(sql`DATE(${tokenLending.lastLendingDate})`)
    .orderBy(sql`DATE(${tokenLending.lastLendingDate})`);

  // Merge spending and lending data
  const dateMap = new Map<string, GraphDataPoint>();

  for (const item of spendingData) {
    dateMap.set(item.date, {
      date: item.date,
      spent: Number(item.spent),
      lent: 0,
    });
  }

  for (const item of lendingData) {
    const existing = dateMap.get(item.date);
    if (existing) {
      existing.lent = Number(item.lent);
    } else {
      dateMap.set(item.date, {
        date: item.date,
        spent: 0,
        lent: Number(item.lent),
      });
    }
  }

  return Array.from(dateMap.values()).sort((a, b) =>
    a.date.localeCompare(b.date),
  );
}

/**
 * Helper functions to get graph data for different time periods
 */
export async function getGraphDataWeek(userId: string): Promise<GraphDataPoint[]> {
  const end = new Date();
  const start = new Date();
  start.setDate(start.getDate() - 7);
  return getGraphData(userId, start, end);
}

export async function getGraphDataMonth(userId: string): Promise<GraphDataPoint[]> {
  const end = new Date();
  const start = new Date();
  start.setMonth(start.getMonth() - 1);
  return getGraphData(userId, start, end);
}

export async function getGraphDataQuarter(userId: string): Promise<GraphDataPoint[]> {
  const end = new Date();
  const start = new Date();
  start.setMonth(start.getMonth() - 3);
  return getGraphData(userId, start, end);
}

export async function getGraphDataYear(userId: string): Promise<GraphDataPoint[]> {
  const end = new Date();
  const start = new Date();
  start.setFullYear(start.getFullYear() - 1);
  return getGraphData(userId, start, end);
}
