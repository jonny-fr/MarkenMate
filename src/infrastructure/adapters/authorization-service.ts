import "server-only";
import type { IAuthorizationService } from "@/application/ports/authorization-service";
import {
  UnauthorizedError,
  ForbiddenError,
} from "@/application/ports/authorization-service";
import { db } from "@/db";
import { user } from "@/db/schema";
import { eq } from "drizzle-orm";

/**
 * Authorization service implementation
 * Centralizes all authorization logic
 */
export class AuthorizationService implements IAuthorizationService {
  async requireAuthenticated(userId: string): Promise<void> {
    if (!userId) {
      throw new UnauthorizedError("User must be authenticated");
    }

    const [userRecord] = await db
      .select({ id: user.id })
      .from(user)
      .where(eq(user.id, userId))
      .limit(1);

    if (!userRecord) {
      throw new UnauthorizedError("User not found");
    }
  }

  async requireAdmin(userId: string): Promise<void> {
    await this.requireAuthenticated(userId);

    const [userRecord] = await db
      .select({ role: user.role })
      .from(user)
      .where(eq(user.id, userId))
      .limit(1);

    if (!userRecord || userRecord.role !== "admin") {
      throw new ForbiddenError("Admin access required");
    }
  }

  async requireOwnership(
    userId: string,
    resourceOwnerId: string,
  ): Promise<void> {
    await this.requireAuthenticated(userId);

    if (userId !== resourceOwnerId) {
      throw new ForbiddenError("User does not own this resource");
    }
  }

  async requireAccessToResource(
    userId: string,
    resourceOwnerId: string,
  ): Promise<void> {
    await this.requireAuthenticated(userId);

    // User can access if they own it OR they are admin
    const isOwner = userId === resourceOwnerId;
    if (!isOwner) {
      const admin = await this.isAdmin(userId);
      if (!admin) {
        throw new ForbiddenError("Access denied to this resource");
      }
    }
  }

  async isAdmin(userId: string): Promise<boolean> {
    if (!userId) {
      return false;
    }

    const [userRecord] = await db
      .select({ role: user.role })
      .from(user)
      .where(eq(user.id, userId))
      .limit(1);

    return userRecord?.role === "admin";
  }

  async ownsResource(
    userId: string,
    resourceOwnerId: string,
  ): Promise<boolean> {
    return userId === resourceOwnerId;
  }
}
