import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { db } from "@/db";
import { menuParseBatch, user, auditLog } from "@/db/schema";
import { eq } from "drizzle-orm";

/**
 * API Route to reject batch
 * SECURITY: Admin-only access
 */

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    console.log("[reject] incoming request");
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

    const { reason } = await request.json();

    if (!reason || typeof reason !== "string") {
      return NextResponse.json(
        { success: false, message: "Rejection reason is required" },
        { status: 400 },
      );
    }

    // Update batch status
    await db
      .update(menuParseBatch)
      .set({
        status: "REJECTED",
        rejectedByAdminId: session.user.id,
        rejectedAt: new Date(),
        rejectionReason: reason,
      })
      .where(eq(menuParseBatch.id, batchId));

    // Audit log
    await db.insert(auditLog).values({
      userId: session.user.id,
      action: "MENU_BATCH_REJECT",
      metadata: JSON.stringify({
        batchId,
        reason,
      }),
      ipAddress: null,
      userAgent: null,
      correlationId: `batch-${batchId}`,
    });

    return NextResponse.json({
      success: true,
      message: "Batch rejected successfully",
    });
  } catch (error) {
    console.error("Reject batch error:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Failed to reject batch",
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}
