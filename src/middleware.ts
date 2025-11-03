import { type NextRequest, NextResponse } from "next/server";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { user } from "@/db/schema";
import { eq } from "drizzle-orm";

/**
 * Middleware for authentication and authorization.
 * - Checks if user is authenticated
 * - Forces admin to change password on first login
 * - Restricts admin routes to admin users only
 */
export async function middleware(request: NextRequest) {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  const { pathname } = request.nextUrl;

  // Redirect unauthenticated users to login
  if (!session) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  // Get user details for additional checks
  const [userDetails] = await db
    .select({
      role: user.role,
      mustChangePassword: user.mustChangePassword,
    })
    .from(user)
    .where(eq(user.id, session.user.id))
    .limit(1);

  if (!userDetails) {
    // User not found in DB, force logout
    return NextResponse.redirect(new URL("/login", request.url));
  }

  // Force password change for users with mustChangePassword flag
  if (userDetails.mustChangePassword && pathname !== "/admin/change-password") {
    return NextResponse.redirect(
      new URL("/admin/change-password", request.url),
    );
  }

  // Restrict admin routes to admin users only
  if (pathname.startsWith("/admin") && pathname !== "/admin/change-password") {
    if (userDetails.role !== "admin") {
      return NextResponse.redirect(new URL("/dashboard", request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  runtime: "nodejs",
  matcher: ["/dashboard", "/admin/:path*"], // Apply middleware to dashboard and all admin routes
};
