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
import { z } from "zod";

/**
 * API Route to approve batch and publish to menu
 * SECURITY: Admin-only access
 */

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    console.log("[approve] incoming request");
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

    const body = await request.json();

    const schema = z.object({
      itemActions: z.record(
        z.string(),
        z.enum(["ACCEPT", "EDIT", "REJECT", "PENDING"]),
      ),
      editedItems: z
        .record(
          z.string(),
          z.object({
            dishName: z.string().min(1).optional(),
            priceEur: z
              .string()
              .refine((v) => !Number.isNaN(Number.parseFloat(v)), {
                message: "Invalid price",
              })
              .optional(),
            category: z.string().nullable().optional(),
            description: z.string().nullable().optional(),
            options: z
              .string()
              .nullable()
              .optional()
              .refine((v) => {
                if (!v) return true;
                try {
                  JSON.parse(v);
                  return true;
                } catch {
                  return false;
                }
              }, "Options must be valid JSON"),
          }),
        )
        .optional()
        .default({}),
    });

    const { itemActions, editedItems } = schema.parse(body);

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
      .filter(([, action]) => action === "ACCEPT" || action === "EDIT")
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
      const edits = editedItems[String(item.id)];
      const effectiveDishName = edits?.dishName ?? item.dishName;
      const effectivePrice = edits?.priceEur ?? item.priceEur;
      const effectiveCategory = edits?.category ?? item.category ?? "Sonstige";
      const effectiveDescription = edits?.description ?? item.description;
      const effectiveOptions = edits?.options ?? item.options;

      // Check if dish already exists (case-insensitive comparison)
      const normalizedName = effectiveDishName.toLowerCase();
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
            price: effectivePrice,
            category: effectiveCategory || existing.category,
          })
          .where(eq(menuItem.id, existing.id));
        updatedCount++;
      } else {
        // Insert new - map category to type
        let type: "drink" | "main_course" | "dessert" = "main_course";
        const categoryLower = (effectiveCategory || "").toLowerCase();

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
          dishName: effectiveDishName,
          type,
          category: effectiveCategory || "Sonstige",
          price: effectivePrice,
          givesRefund: false,
        });
        insertedCount++;
      }

      // Update item action
      await db
        .update(menuParseItem)
        .set({
          action: (itemActions[String(item.id)] === "EDIT" ? "EDIT" : "ACCEPT") as any,
          editedData: edits ? JSON.stringify(edits) : null,
        })
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
