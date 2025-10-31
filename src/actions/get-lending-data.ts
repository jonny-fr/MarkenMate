import "server-only";
import { db } from "@/db";
import { tokenLending } from "@/db/schema";
import { eq } from "drizzle-orm";

export type LendingUser = {
  id: string;
  name: string;
  balance: number;
  note?: string;
};

/**
 * Fetches token lending data for the demo user.
 * In a production app, this would fetch data for the authenticated user.
 */
export async function getLendingData(): Promise<LendingUser[]> {
  // For demo purposes, we fetch data for the demo user
  const demoUserId = "demo-user-123";

  const lendingRecords = await db
    .select()
    .from(tokenLending)
    .where(eq(tokenLending.userId, demoUserId));

  return lendingRecords.map((record) => ({
    id: `${record.id}`,
    name: record.personName,
    balance: record.tokenCount,
    note: `${record.acceptanceStatus === "pending" ? "Ausstehend" : "Bestätigt"} - ${record.totalTokensLent} gesamt`,
  }));
}
