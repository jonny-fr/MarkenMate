import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { MenuParserOrchestrator } from "@/domain/services/menu-ingestion/menu-parser-orchestrator";
import { db } from "@/db";
import { auditLog, user } from "@/db/schema";
import { eq } from "drizzle-orm";

/**
 * API Route for Menu PDF Upload
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
        {
          success: false,
          message: "Authentication required",
          error: "UNAUTHORIZED",
        },
        { status: 401 },
      );
    }

    // SECURITY: Verify admin role
    const [userDetails] = await db
      .select({ role: user.role })
      .from(user)
      .where(eq(user.id, session.user.id))
      .limit(1);

    if (!userDetails || userDetails.role !== "admin") {
      return NextResponse.json(
        {
          success: false,
          message: "Admin access required",
          error: "FORBIDDEN",
        },
        { status: 403 },
      );
    }

    const adminId = session.user.id;

    // Get file from form data
    const formData = await request.formData();
    const file = formData.get("pdf") as File | null;

    if (!file) {
      return NextResponse.json(
        {
          success: false,
          message: "No file provided",
          error: "NO_FILE",
        },
        { status: 400 },
      );
    }

    // Convert file to buffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Upload and parse
    const result = await MenuParserOrchestrator.uploadAndParse({
      adminId,
      filename: file.name,
      buffer,
      mimeType: file.type,
    });

    // SECURITY: Audit log
    await db.insert(auditLog).values({
      userId: adminId,
      action: "MENU_PDF_UPLOAD",
      metadata: JSON.stringify({
        batchId: result.batchId,
        filename: file.name,
        fileSize: buffer.length,
        status: result.status,
      }),
      ipAddress: null,
      userAgent: null,
      correlationId: `batch-${result.batchId}`,
    });

    return NextResponse.json({
      success: true,
      message: result.message,
      batchId: result.batchId,
      warnings: result.warnings,
    });
  } catch (error) {
    console.error("Menu upload error:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Upload failed",
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}
