import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { db } from "@/db";
import { restaurant, user, auditLog } from "@/db/schema";
import { eq } from "drizzle-orm";

/**
 * API Route to create new restaurant
 * SECURITY: Admin-only access
 */

export async function POST(request: Request) {
  try {
    // SECURITY: Verify admin authentication
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user) {
      return NextResponse.json(
        { success: false, message: "Authentication required" },
        { status: 401 },
      );
    }

    // Verify admin role
    const [userDetails] = await db
      .select({ role: user.role })
      .from(user)
      .where(eq(user.id, session.user.id))
      .limit(1);

    if (!userDetails || userDetails.role !== "admin") {
      return NextResponse.json(
        { success: false, message: "Admin access required" },
        { status: 403 },
      );
    }

    const body = await request.json();
    const { name, location, tag, phoneNumber } = body;

    // Validate required fields
    if (!name || !location || !tag) {
      return NextResponse.json(
        {
          success: false,
          message: "Name, location, and tag are required",
        },
        { status: 400 },
      );
    }

    // Validate field lengths
    if (name.length > 200 || location.length > 500 || tag.length > 100) {
      return NextResponse.json(
        { success: false, message: "Field length exceeds maximum" },
        { status: 400 },
      );
    }

    // Create restaurant
    const [newRestaurant] = await db
      .insert(restaurant)
      .values({
        name: name.trim(),
        location: location.trim(),
        tag: tag.trim(),
        phoneNumber: phoneNumber?.trim() || null,
        rating: null,
        openingHours: null,
      })
      .returning();

    // Audit log
    await db.insert(auditLog).values({
      userId: session.user.id,
      action: "RESTAURANT_CREATE",
      metadata: JSON.stringify({
        restaurantId: newRestaurant.id,
        name: newRestaurant.name,
      }),
      ipAddress: null,
      userAgent: null,
      correlationId: `restaurant-${newRestaurant.id}`,
    });

    return NextResponse.json({
      success: true,
      message: "Restaurant created successfully",
      restaurantId: newRestaurant.id,
      restaurant: newRestaurant,
    });
  } catch (error) {
    console.error("Create restaurant error:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Failed to create restaurant",
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}
