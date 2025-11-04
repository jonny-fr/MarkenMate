import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { db } from "@/db";
import {
  menuParseBatch,
  menuParseItem,
  menuItem,
  user,
  auditLog,
} from "@/db/schema";
import { eq, inArray, and } from "drizzle-orm";
import { sql } from "drizzle-orm";

/**
 * API Route to approve batch and publish to menu
 * SECURITY: Admin-only access
 */

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
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

    const { itemActions } = await request.json();

    if (!itemActions || typeof itemActions !== "object") {
      return NextResponse.json(
        { success: false, message: "Invalid item actions" },
        { status: 400 },
      );
    }

    // Get batch details
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

    if (!batch.restaurantId) {
      return NextResponse.json(
        { success: false, message: "Restaurant must be assigned first" },
        { status: 400 },
      );
    }

    // Get accepted items
    const acceptedItemIds = Object.entries(itemActions)
      .filter(([, action]) => action === "ACCEPT")
      .map(([id]) => Number.parseInt(id, 10));

    if (acceptedItemIds.length === 0) {
      return NextResponse.json(
        { success: false, message: "No items accepted" },
        { status: 400 },
      );
    }

    const acceptedItems = await db
      .select()
      .from(menuParseItem)
      .where(
        and(
          eq(menuParseItem.batchId, batchId),
          inArray(menuParseItem.id, acceptedItemIds),
        ),
      );

    // Update batch status
    await db
      .update(menuParseBatch)
      .set({
        status: "PUBLISHING",
        approvedByAdminId: session.user.id,
        approvedAt: new Date(),
      })
      .where(eq(menuParseBatch.id, batchId));

    // Publish items to menu (upsert based on name)
    let insertedCount = 0;
    let updatedCount = 0;

    for (const item of acceptedItems) {
      // Check if dish already exists (case-insensitive comparison)
      const normalizedName = item.dishName.toLowerCase();
      const existingItems = await db
        .select()
        .from(menuItem)
        .where(eq(menuItem.restaurantId, batch.restaurantId));

      const existing = existingItems.find(
        (existing) => existing.dishName.toLowerCase() === normalizedName,
      );

      if (existing) {
        // Update existing
        await db
          .update(menuItem)
          .set({
            price: item.priceEur,
            category: item.category || existing.category,
          })
          .where(eq(menuItem.id, existing.id));
        updatedCount++;
      } else {
        // Insert new - map category to type
        let type: "drink" | "main_course" | "dessert" = "main_course";
        const categoryLower = item.category?.toLowerCase() || "";

        if (
          categoryLower.includes("getränk") ||
          categoryLower.includes("drink")
        ) {
          type = "drink";
        } else if (
          categoryLower.includes("dessert") ||
          categoryLower.includes("nachspeise")
        ) {
          type = "dessert";
        }

        await db.insert(menuItem).values({
          restaurantId: batch.restaurantId,
          dishName: item.dishName,
          type,
          category: item.category || "Sonstige",
          price: item.priceEur,
          givesRefund: false,
        });
        insertedCount++;
      }

      // Update item action
      await db
        .update(menuParseItem)
        .set({ action: "ACCEPT" })
        .where(eq(menuParseItem.id, item.id));
    }

    // Mark batch as published
    await db
      .update(menuParseBatch)
      .set({
        status: "PUBLISHED",
        publishedAt: new Date(),
      })
      .where(eq(menuParseBatch.id, batchId));

    // Audit log
    await db.insert(auditLog).values({
      userId: session.user.id,
      action: "MENU_BATCH_APPROVE_PUBLISH",
      metadata: JSON.stringify({
        batchId,
        restaurantId: batch.restaurantId,
        insertedCount,
        updatedCount,
        totalAccepted: acceptedItems.length,
      }),
      ipAddress: null,
      userAgent: null,
      correlationId: `batch-${batchId}`,
    });

    return NextResponse.json({
      success: true,
      message: `Published ${insertedCount} new items and updated ${updatedCount} existing items`,
      insertedCount,
      updatedCount,
    });
  } catch (error) {
    console.error("Approve batch error:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Failed to approve batch",
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}
