"use server";

import "server-only";
import { db } from "@/db";
import { user } from "@/db/schema";
import { ne } from "drizzle-orm";

export type UserSearchResult = {
  id: string;
  name: string;
  email: string;
};

/**
 * Search for users by name or email.
 * Excludes the current user from results.
 */
export async function searchUsers(
  query: string,
  currentUserId: string,
): Promise<UserSearchResult[]> {
  if (!query || query.trim().length < 2) {
    return [];
  }

  try {
    const _searchPattern = `%${query.trim()}%`;

    const results = await db
      .select({
        id: user.id,
        name: user.name,
        email: user.email,
      })
      .from(user)
      .where(ne(user.id, currentUserId))
      .limit(10); // Limit to 10 results for performance

    // Filter results by name or email matching query (case-insensitive)
    const filteredResults = results.filter(
      (u) =>
        u.name.toLowerCase().includes(query.toLowerCase()) ||
        u.email.toLowerCase().includes(query.toLowerCase()),
    );

    return filteredResults.slice(0, 5); // Return top 5 matches
  } catch (error) {
    console.error("Error searching users:", error);
    return [];
  }
}
