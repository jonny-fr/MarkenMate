"use server";

import "server-only";
import { db } from "@/db";
import { tokenLending, user } from "@/db/schema";
import { eq } from "drizzle-orm";

export type LendingUser = {
  id: number;
  name: string;
  balance: number;
  status: "pending" | "accepted" | "declined";
  note?: string;
};

/**
 * Fetches token lending data for the authenticated user.
 */
export async function getLendingData(userId: string): Promise<LendingUser[]> {
  const lendingRecords = await db
    .select({
      id: tokenLending.id,
      personName: tokenLending.personName,
      lendToUserId: tokenLending.lendToUserId,
      tokenCount: tokenLending.tokenCount,
      totalTokensLent: tokenLending.totalTokensLent,
      acceptanceStatus: tokenLending.acceptanceStatus,
      lendToUserName: user.name,
      lendToUserEmail: user.email,
    })
    .from(tokenLending)
    .leftJoin(user, eq(tokenLending.lendToUserId, user.id))
    .where(eq(tokenLending.userId, userId));

  return lendingRecords.map((record) => ({
    id: record.id,
    name: record.lendToUserName || record.personName, // Use user.name if available, fallback to personName
    balance: record.tokenCount,
    status: record.acceptanceStatus as "pending" | "accepted" | "declined",
    note: `${record.acceptanceStatus === "pending" ? "Ausstehend" : "Bestätigt"} - ${record.totalTokensLent} gesamt`,
  }));
}
