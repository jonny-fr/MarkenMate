/**
 * Authorization service port interface
 * Centralizes all authorization logic
 */

export class UnauthorizedError extends Error {
  constructor(message = "Unauthorized access") {
    super(message);
    this.name = "UnauthorizedError";
  }
}

export class ForbiddenError extends Error {
  constructor(message = "Forbidden - insufficient permissions") {
    super(message);
    this.name = "ForbiddenError";
  }
}

export interface IAuthorizationService {
  /**
   * Verify user is authenticated
   * Throws UnauthorizedError if not authenticated
   */
  requireAuthenticated(userId: string): Promise<void>;

  /**
   * Verify user has admin role
   * Throws ForbiddenError if not admin
   */
  requireAdmin(userId: string): Promise<void>;

  /**
   * Verify user owns the resource
   * Throws ForbiddenError if user doesn't own resource
   */
  requireOwnership(userId: string, resourceOwnerId: string): Promise<void>;

  /**
   * Verify user can access resource
   * User can access if they own it OR they are admin
   */
  requireAccessToResource(
    userId: string,
    resourceOwnerId: string,
  ): Promise<void>;

  /**
   * Check if user is admin (without throwing)
   */
  isAdmin(userId: string): Promise<boolean>;

  /**
   * Check if user owns resource (without throwing)
   */
  ownsResource(userId: string, resourceOwnerId: string): Promise<boolean>;
}
