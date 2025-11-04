import "server-only";
import { db } from "@/db";
import { accountAction } from "@/db/schema";
import { eq, and, desc } from "drizzle-orm";

type AccountActionType = "CHANGE_PASSWORD" | "CHANGE_EMAIL" | "CHANGE_USERNAME";

/**
 * Check if a user can perform an account action based on rate limiting (1x per day).
 * Returns true if action is allowed, false if rate limit exceeded.
 */
export async function canPerformAccountAction(
  userId: string,
  action: AccountActionType,
): Promise<{ allowed: boolean; nextAllowedAt?: Date }> {
  // Get the most recent action of this type for this user
  const [recentAction] = await db
    .select()
    .from(accountAction)
    .where(
      and(eq(accountAction.userId, userId), eq(accountAction.action, action)),
    )
    .orderBy(desc(accountAction.lastActionAt))
    .limit(1);

  if (!recentAction) {
    // No previous action found - allow
    return { allowed: true };
  }

  // Check if 24 hours have passed
  const now = new Date();
  const lastActionTime = new Date(recentAction.lastActionAt);
  const hoursSinceLastAction =
    (now.getTime() - lastActionTime.getTime()) / (1000 * 60 * 60);

  if (hoursSinceLastAction >= 24) {
    return { allowed: true };
  }

  // Calculate when the next action will be allowed
  const nextAllowedAt = new Date(
    lastActionTime.getTime() + 24 * 60 * 60 * 1000,
  );

  return {
    allowed: false,
    nextAllowedAt,
  };
}

/**
 * Record that a user has performed an account action.
 * Should be called AFTER the action has been successfully completed.
 */
export async function recordAccountAction(
  userId: string,
  action: AccountActionType,
): Promise<void> {
  await db.insert(accountAction).values({
    userId,
    action,
    lastActionAt: new Date(),
  });
}

/**
 * Format the time remaining until the next action is allowed.
 */
export function formatTimeRemaining(nextAllowedAt: Date): string {
  const now = new Date();
  const msRemaining = nextAllowedAt.getTime() - now.getTime();
  const hoursRemaining = Math.ceil(msRemaining / (1000 * 60 * 60));

  if (hoursRemaining === 1) {
    return "in 1 Stunde";
  }

  return `in ${hoursRemaining} Stunden`;
}
