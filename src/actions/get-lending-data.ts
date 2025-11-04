"use server";

import "server-only";
import { db } from "@/db";
import { tokenLending, user } from "@/db/schema";
import { eq, or } from "drizzle-orm";

export type LendingUser = {
  id: number;
  name: string;
  balance: number;
  status: "pending" | "accepted" | "declined";
  note?: string;
  isLender: boolean; // true if current user is lending OUT, false if borrowing
  otherUserId?: string; // ID of the other user in this relationship
};

/**
 * Fetches token lending data for the authenticated user.
 * Returns BOTH:
 * - Lendings where user is the LENDER (userId = current user)
 * - Lendings where user is the BORROWER (lendToUserId = current user)
 */
export async function getLendingData(userId: string): Promise<LendingUser[]> {
  // Fetch lendings where user is the LENDER
  const lendingRecordsAsLender = await db
    .select({
      id: tokenLending.id,
      personName: tokenLending.personName,
      userId: tokenLending.userId,
      lendToUserId: tokenLending.lendToUserId,
      tokenCount: tokenLending.tokenCount,
      totalTokensLent: tokenLending.totalTokensLent,
      acceptanceStatus: tokenLending.acceptanceStatus,
      otherUserName: user.name,
      otherUserEmail: user.email,
    })
    .from(tokenLending)
    .leftJoin(user, eq(tokenLending.lendToUserId, user.id))
    .where(eq(tokenLending.userId, userId));

  // Fetch lendings where user is the BORROWER
  const lendingRecordsAsBorrower = await db
    .select({
      id: tokenLending.id,
      personName: tokenLending.personName,
      userId: tokenLending.userId,
      lendToUserId: tokenLending.lendToUserId,
      tokenCount: tokenLending.tokenCount,
      totalTokensLent: tokenLending.totalTokensLent,
      acceptanceStatus: tokenLending.acceptanceStatus,
      otherUserName: user.name,
      otherUserEmail: user.email,
    })
    .from(tokenLending)
    .leftJoin(user, eq(tokenLending.userId, user.id))
    .where(eq(tokenLending.lendToUserId, userId));

  // Combine and transform records
  const asLender = lendingRecordsAsLender.map((record) => ({
    id: record.id,
    name: record.otherUserName || record.personName,
    balance: record.tokenCount, // positive = lent out
    status: record.acceptanceStatus as "pending" | "accepted" | "declined",
    note: `${record.acceptanceStatus === "pending" ? "⏳ Ausstehend" : "✓ Bestätigt"} - ${record.totalTokensLent} gesamt verliehen`,
    isLender: true,
    otherUserId: record.lendToUserId || undefined,
  }));

  const asBorrower = lendingRecordsAsBorrower.map((record) => ({
    id: record.id,
    name: record.otherUserName || record.personName,
    balance: -record.tokenCount, // negative = borrowed (owes)
    status: record.acceptanceStatus as "pending" | "accepted" | "declined",
    note: `${record.acceptanceStatus === "pending" ? "⏳ Ausstehend" : "✓ Bestätigt"} - ${record.totalTokensLent} gesamt geliehen`,
    isLender: false,
    otherUserId: record.userId || undefined,
  }));

  // Return combined list (borrower records first to show pending requests at top)
  return [...asBorrower, ...asLender];
}
