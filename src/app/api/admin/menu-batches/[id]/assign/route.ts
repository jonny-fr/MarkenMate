import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { db } from "@/db";
import { menuParseBatch, user, auditLog } from "@/db/schema";
import { eq } from "drizzle-orm";

/**
 * API Route to assign restaurant to batch
 * SECURITY: Admin-only access
 */

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    console.log("[assign] incoming request");
    const { id } = await context.params;
    const batchId = Number.parseInt(id, 10);

    if (Number.isNaN(batchId)) {
      return NextResponse.json(
        { success: false, message: "Invalid batch ID" },
        { status: 400 },
      );
    }

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

    const { restaurantId } = await request.json();

    if (!restaurantId || Number.isNaN(Number(restaurantId))) {
      return NextResponse.json(
        { success: false, message: "Invalid restaurant ID" },
        { status: 400 },
      );
    }

    // Update batch with restaurant assignment
    await db
      .update(menuParseBatch)
      .set({
        restaurantId: Number(restaurantId),
        status: "CHANGES_PROPOSED",
      })
      .where(eq(menuParseBatch.id, batchId));

    // Audit log
    await db.insert(auditLog).values({
      userId: session.user.id,
      action: "MENU_BATCH_ASSIGN_RESTAURANT",
      metadata: JSON.stringify({
        batchId,
        restaurantId,
      }),
      ipAddress: null,
      userAgent: null,
      correlationId: `batch-${batchId}`,
    });

    return NextResponse.json({
      success: true,
      message: "Restaurant assigned successfully",
    });
  } catch (error) {
    console.error("Assign restaurant error:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Failed to assign restaurant",
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}
