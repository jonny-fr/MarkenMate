"use server";

import "server-only";
import { db } from "@/db";
import { user } from "@/db/schema";
import { ne, or, and, ilike } from "drizzle-orm";
import { z } from "zod";
import { sanitizeString } from "@/lib/input-sanitization";

export type UserSearchResult = {
  id: string;
  name: string;
  email: string;
};

// Validation schema for search query
const searchQuerySchema = z.object({
  query: z
    .string()
    .min(2, "Suchbegriff muss mindestens 2 Zeichen lang sein")
    .max(100, "Suchbegriff darf maximal 100 Zeichen lang sein")
    .transform((val) =>
      sanitizeString(val, {
        maxLength: 100,
        allowSpecialChars: false,
        allowNewlines: false,
      }),
    )
    .refine(
      (val) => {
        // Prevent LIKE pattern injection
        return !val.includes("%") && !val.includes("_");
      },
      {
        message: "Ungültige Zeichen im Suchbegriff",
      },
    ),
  currentUserId: z.string().min(1, "Benutzer-ID ist erforderlich"),
});

/**
 * Search for users by name or email with input validation.
 * Excludes the current user from results.
 * SECURITY: Input is validated and sanitized to prevent SQL injection.
 */
export async function searchUsers(
  query: string,
  currentUserId: string,
): Promise<UserSearchResult[]> {
  try {
    // SECURITY: Validate and sanitize inputs
    const validationResult = searchQuerySchema.safeParse({
      query,
      currentUserId,
    });

    if (!validationResult.success) {
      console.warn(
        "[search-users] Invalid input:",
        validationResult.error.message,
      );
      return [];
    }

    const { query: sanitizedQuery, currentUserId: validUserId } =
      validationResult.data;

    // Perform database search with sanitized input
    // SECURITY: Filter at database level for performance and security
    const results = await db
      .select({
        id: user.id,
        name: user.name,
        email: user.email,
      })
      .from(user)
      .where(
        and(
          ne(user.id, validUserId), // Exclude current user at DB level
          or(
            ilike(user.name, `%${sanitizedQuery}%`),
            ilike(user.email, `%${sanitizedQuery}%`),
          ),
        ),
      )
      .limit(5); // Return top 5 matches

    return results;
  } catch (error) {
    console.error("[search-users] Error:", error);
    // Don't leak internal error details
    return [];
  }
}
