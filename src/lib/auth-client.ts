import { createAuthClient } from "better-auth/react";

/**
 * See: https://www.better-auth.com/docs/installation#create-client-instance
 *
 * We make use of the "object destructuring" syntax to get the individual functions, making stuff a bit shorter in imports.
 *
 * All these functions here should be called from client side only! (IMO, you should prefer the server side stuff tho, see auth-server.ts).
 */

// CRITICAL: This file is CLIENT-SIDE ONLY
// We MUST use window.location.origin to get the correct port at runtime
// DO NOT use NEXT_PUBLIC_BETTER_AUTH_URL as it's embedded at build-time

// For production: Use current origin (localhost:8080 when accessed via browser)
// For development: Use current origin (localhost:3000)
const baseURL =
  typeof window !== "undefined"
    ? window.location.origin
    : "http://localhost:3000"; // SSR fallback (rarely used)

export const { signIn, signUp, signOut, useSession, getSession } =
  createAuthClient({
    baseURL,
  });
