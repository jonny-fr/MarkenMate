import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { db } from "@/db";
import { menuParseBatch, menuParseItem, auditLog, user } from "@/db/schema";
import { eq } from "drizzle-orm";

/**
 * API Route for Menu Batch Deletion
 * SECURITY: Admin-only access
 */
export async function POST(request: Request) {
  try {
    // Authenticate user
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user) {
      return NextResponse.json(
        { success: false, message: "Unauthorized: Authentication required" },
        { status: 401 },
      );
    }

    // Verify admin role from database
    const [userRecord] = await db
      .select()
      .from(user)
      .where(eq(user.id, session.user.id))
      .limit(1);

    if (!userRecord || userRecord.role !== "admin") {
      return NextResponse.json(
        { success: false, message: "Unauthorized: Admin access required" },
        { status: 403 },
      );
    }

    // Parse request body
    const body = await request.json();
    const { batchId } = body;

    if (!batchId || typeof batchId !== "number") {
      return NextResponse.json(
        { success: false, message: "Invalid batch ID" },
        { status: 400 },
      );
    }

    // Get batch details for audit log
    const [batch] = await db
      .select()
      .from(menuParseBatch)
      .where(eq(menuParseBatch.id, batchId))
      .limit(1);

    if (!batch) {
      return NextResponse.json(
        { success: false, message: "Batch not found" },
        { status: 404 },
      );
    }

    // Count items before deletion
    const items = await db
      .select()
      .from(menuParseItem)
      .where(eq(menuParseItem.batchId, batchId));

    // Delete all associated items first
    await db.delete(menuParseItem).where(eq(menuParseItem.batchId, batchId));

    // Delete the batch
    await db.delete(menuParseBatch).where(eq(menuParseBatch.id, batchId));

    // SECURITY: Audit log
    await db.insert(auditLog).values({
      userId: session.user.id,
      action: "MENU_BATCH_DELETE",
      metadata: JSON.stringify({
        batchId,
        filename: batch.filename,
        status: batch.status,
        itemCount: items.length,
      }),
      ipAddress: null,
      userAgent: null,
      correlationId: `batch-delete-${batchId}`,
    });

    return NextResponse.json({
      success: true,
      message: "Batch deleted successfully",
    });
  } catch (error) {
    console.error("[API] Menu batch delete error:", error);
    return NextResponse.json(
      {
        success: false,
        message:
          error instanceof Error ? error.message : "Failed to delete batch",
      },
      { status: 500 },
    );
  }
}
