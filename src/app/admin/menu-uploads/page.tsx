import { Suspense } from "react";
import { db } from "@/db";
import { menuParseBatch, user } from "@/db/schema";
import { desc, eq } from "drizzle-orm";
import { UploadSection } from "./_components/upload-section";
import { BatchList } from "./_components/batch-list";

export const metadata = {
  title: "Menu Uploads | Admin",
  description: "Upload and review restaurant menus from PDF",
};

async function getBatches() {
  const batches = await db
    .select({
      id: menuParseBatch.id,
      filename: menuParseBatch.filename,
      status: menuParseBatch.status,
      fileSize: menuParseBatch.fileSize,
      uploadedByName: user.name,
      createdAt: menuParseBatch.createdAt,
      updatedAt: menuParseBatch.updatedAt,
    })
    .from(menuParseBatch)
    .leftJoin(user, eq(user.id, menuParseBatch.uploadedByAdminId))
    .orderBy(desc(menuParseBatch.createdAt))
    .limit(50);

  return batches;
}

export default async function MenuUploadsPage() {
  const batches = await getBatches();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Menu Uploads</h1>
        <p className="text-muted-foreground">
          Upload restaurant menus as PDF for automated parsing and review
        </p>
      </div>

      <UploadSection />

      <div>
        <h2 className="text-2xl font-semibold mb-4">Recent Uploads</h2>
        <Suspense fallback={<div>Loading batches...</div>}>
          <BatchList batches={batches} />
        </Suspense>
      </div>
    </div>
  );
}
