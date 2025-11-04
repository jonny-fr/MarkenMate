import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { menuParseBatch, menuParseItem, user, auditLog } from "@/db/schema";
import { and, eq } from "drizzle-orm";
import { z } from "zod";

// POST: update action for a single parsed item (ACCEPT/REJECT/EDIT) and optional edited data
export async function POST(
  request: Request,
  context: { params: Promise<{ id: string; itemId: string }> },
) {
  try {
    console.log("[item-action] incoming request");
    const { id, itemId } = await context.params;
    const batchId = Number.parseInt(id, 10);
    const parsedItemId = Number.parseInt(itemId, 10);

    if (Number.isNaN(batchId) || Number.isNaN(parsedItemId)) {
      return NextResponse.json(
        { success: false, message: "Invalid batch or item ID" },
        { status: 400 },
      );
    }

    // Auth + admin check
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session?.user) {
      return NextResponse.json(
        { success: false, message: "Authentication required" },
        { status: 401 },
      );
    }

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

    const schema = z.object({
      action: z.enum(["ACCEPT", "REJECT", "EDIT"]),
      editedData: z
        .object({
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
        })
        .optional(),
    });

    const body = await request.json();
    const { action, editedData } = schema.parse(body);

    // Ensure item belongs to given batch
    const [item] = await db
      .select({ id: menuParseItem.id })
      .from(menuParseItem)
      .where(
        and(
          eq(menuParseItem.id, parsedItemId),
          eq(menuParseItem.batchId, batchId),
        ),
      )
      .limit(1);

    if (!item) {
      return NextResponse.json(
        { success: false, message: "Item not found for batch" },
        { status: 404 },
      );
    }

    await db
      .update(menuParseItem)
      .set({
        action: action as any,
        editedData: editedData ? JSON.stringify(editedData) : null,
      })
      .where(eq(menuParseItem.id, parsedItemId));

    await db.insert(auditLog).values({
      userId: session.user.id,
      action: "MENU_PARSE_ITEM_UPDATE",
      metadata: JSON.stringify({ batchId, itemId: parsedItemId, action }),
      ipAddress: null,
      userAgent: null,
      correlationId: `batch-${batchId}`,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Item action error:", error);
    return NextResponse.json(
      { success: false, message: "Failed to update item action" },
      { status: 500 },
    );
  }
}

// DELETE: remove a single parsed item
export async function DELETE(
  _request: Request,
  context: { params: Promise<{ id: string; itemId: string }> },
) {
  try {
    console.log("[item-delete] incoming request");
    const { id, itemId } = await context.params;
    const batchId = Number.parseInt(id, 10);
    const parsedItemId = Number.parseInt(itemId, 10);

    if (Number.isNaN(batchId) || Number.isNaN(parsedItemId)) {
      return NextResponse.json(
        { success: false, message: "Invalid batch or item ID" },
        { status: 400 },
      );
    }

    const session = await auth.api.getSession({ headers: await headers() });
    if (!session?.user) {
      return NextResponse.json(
        { success: false, message: "Authentication required" },
        { status: 401 },
      );
    }

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

    // Ensure item belongs to batch before deleting
    const [item] = await db
      .select({ id: menuParseItem.id })
      .from(menuParseItem)
      .where(
        and(
          eq(menuParseItem.id, parsedItemId),
          eq(menuParseItem.batchId, batchId),
        ),
      )
      .limit(1);

    if (!item) {
      return NextResponse.json(
        { success: false, message: "Item not found for batch" },
        { status: 404 },
      );
    }

    await db.delete(menuParseItem).where(eq(menuParseItem.id, parsedItemId));

    await db.insert(auditLog).values({
      userId: session.user.id,
      action: "MENU_PARSE_ITEM_DELETE",
      metadata: JSON.stringify({ batchId, itemId: parsedItemId }),
      ipAddress: null,
      userAgent: null,
      correlationId: `batch-${batchId}`,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Item delete error:", error);
    return NextResponse.json(
      { success: false, message: "Failed to delete item" },
      { status: 500 },
    );
  }
}
