import { notFound } from "next/navigation";
import { db } from "@/db";
import { menuParseBatch, menuParseItem, user, restaurant } from "@/db/schema";
import { eq } from "drizzle-orm";
import { BatchDetail } from "../_components/batch-detail";
import { ReviewActions } from "../_components/review-actions";

interface PageProps {
  params: Promise<{
    id: string;
  }>;
}

async function getBatchDetails(batchId: number) {
  const [batch] = await db
    .select({
      id: menuParseBatch.id,
      filename: menuParseBatch.filename,
      status: menuParseBatch.status,
      fileSize: menuParseBatch.fileSize,
      isTextNative: menuParseBatch.isTextNative,
      parseLog: menuParseBatch.parseLog,
      errorMessage: menuParseBatch.errorMessage,
      restaurantId: menuParseBatch.restaurantId,
      restaurantName: restaurant.name,
      restaurantLocation: restaurant.location,
      uploadedByName: user.name,
      createdAt: menuParseBatch.createdAt,
      updatedAt: menuParseBatch.updatedAt,
    })
    .from(menuParseBatch)
    .leftJoin(user, eq(user.id, menuParseBatch.uploadedByAdminId))
    .leftJoin(restaurant, eq(restaurant.id, menuParseBatch.restaurantId))
    .where(eq(menuParseBatch.id, batchId))
    .limit(1);

  if (!batch) {
    return null;
  }

  // Get parsed items
  const items = await db
    .select()
    .from(menuParseItem)
    .where(eq(menuParseItem.batchId, batchId))
    .orderBy(menuParseItem.id);

  // Get all restaurants for selection
  const restaurants = await db
    .select({
      id: restaurant.id,
      name: restaurant.name,
      location: restaurant.location,
    })
    .from(restaurant)
    .orderBy(restaurant.name);

  return {
    batch,
    items,
    restaurants,
  };
}

export default async function BatchDetailPage({ params }: PageProps) {
  const { id } = await params;
  const batchId = Number.parseInt(id, 10);

  if (Number.isNaN(batchId)) {
    notFound();
  }

  const data = await getBatchDetails(batchId);

  if (!data) {
    notFound();
  }

  const { batch, items, restaurants } = data;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Review Menu Upload</h1>
        <p className="text-muted-foreground">
          Review and approve parsed menu items from PDF
        </p>
      </div>

      <BatchDetail batch={batch} />

      <ReviewActions
        batchId={batch.id}
        status={batch.status}
        items={items}
        restaurants={restaurants}
        currentRestaurantId={batch.restaurantId}
      />
    </div>
  );
}
