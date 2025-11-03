/**
 * Authentication service port interface
 * Infrastructure layer provides concrete implementation
 */

export interface UserSession {
  userId: string;
  email: string;
  role: "user" | "admin";
}

export interface IAuthenticationService {
  /**
   * Get current session from request context
   * Returns null if not authenticated
   */
  getCurrentSession(): Promise<UserSession | null>;

  /**
   * Verify user is authenticated
   * Throws error if not authenticated
   */
  requireAuthentication(): Promise<UserSession>;

  /**
   * Sign in with email and password
   */
  signIn(email: string, password: string): Promise<UserSession>;

  /**
   * Sign out current user
   */
  signOut(): Promise<void>;
}
