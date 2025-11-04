"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Check, X, Edit } from "lucide-react";
import { toast } from "sonner";
import { CreateRestaurantDialog } from "./create-restaurant-dialog";

interface Restaurant {
  id: number;
  name: string;
  location: string;
}

interface ParseItem {
  id: number;
  batchId: number;
  dishName: string;
  dishNameNormalized: string;
  description: string | null;
  priceEur: string;
  priceConfidence: string | null;
  category: string | null;
  options: string | null;
  pageNumber: number | null;
  rawText: string | null;
  action: string;
  editedData: string | null;
}

interface ReviewActionsProps {
  batchId: number;
  status: string;
  items: ParseItem[];
  restaurants: Restaurant[];
  currentRestaurantId: number | null;
}

export function ReviewActions({
  batchId,
  status,
  items,
  restaurants,
  currentRestaurantId,
}: ReviewActionsProps) {
  const [selectedRestaurantId, setSelectedRestaurantId] = useState<
    string | undefined
  >(currentRestaurantId?.toString());
  const [itemActions, setItemActions] = useState<Record<number, string>>(
    items.reduce(
      (acc, item) => {
        acc[item.id] = item.action;
        return acc;
      },
      {} as Record<number, string>,
    ),
  );

  const handleItemAction = (itemId: number, action: string) => {
    setItemActions((prev) => ({ ...prev, [itemId]: action }));
  };

  const handleAssignRestaurant = async () => {
    if (!selectedRestaurantId) {
      toast.error("Please select a restaurant");
      return;
    }

    try {
      const response = await fetch(`/api/admin/menu-batches/${batchId}/assign`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ restaurantId: Number.parseInt(selectedRestaurantId, 10) }),
      });

      const result = await response.json();

      if (result.success) {
        toast.success("Restaurant assigned successfully");
      } else {
        toast.error(result.message || "Failed to assign restaurant");
      }
    } catch (error) {
      toast.error("Failed to assign restaurant");
      console.error(error);
    }
  };

  const handleApprove = async () => {
    if (!selectedRestaurantId) {
      toast.error("Please assign a restaurant first");
      return;
    }

    // Count accepted items
    const acceptedCount = Object.values(itemActions).filter(
      (action) => action === "ACCEPT",
    ).length;

    if (acceptedCount === 0) {
      toast.error("Please accept at least one item");
      return;
    }

    try {
      const response = await fetch(`/api/admin/menu-batches/${batchId}/approve`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ itemActions }),
      });

      const result = await response.json();

      if (result.success) {
        toast.success("Batch approved successfully");
        window.location.href = "/admin/menu-uploads";
      } else {
        toast.error(result.message || "Failed to approve batch");
      }
    } catch (error) {
      toast.error("Failed to approve batch");
      console.error(error);
    }
  };

  const handleReject = async () => {
    const reason = prompt("Please provide a reason for rejection:");
    if (!reason) return;

    try {
      const response = await fetch(`/api/admin/menu-batches/${batchId}/reject`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason }),
      });

      const result = await response.json();

      if (result.success) {
        toast.success("Batch rejected");
        window.location.href = "/admin/menu-uploads";
      } else {
        toast.error(result.message || "Failed to reject batch");
      }
    } catch (error) {
      toast.error("Failed to reject batch");
      console.error(error);
    }
  };

  const canReview = status === "PARSED" || status === "CHANGES_PROPOSED";

  return (
    <div className="space-y-6">
      {/* Restaurant Selection */}
      {canReview && (
        <div className="border rounded-lg p-6 bg-card">
          <h3 className="text-lg font-semibold mb-4">Restaurant Assignment</h3>

          <div className="flex gap-4 items-end">
            <div className="flex-1">
              <label className="text-sm text-muted-foreground mb-2 block">
                Select Restaurant
              </label>
              <Select
                value={selectedRestaurantId}
                onValueChange={setSelectedRestaurantId}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Choose a restaurant" />
                </SelectTrigger>
                <SelectContent>
                  {restaurants.map((restaurant) => (
                    <SelectItem key={restaurant.id} value={restaurant.id.toString()}>
                      {restaurant.name} - {restaurant.location}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <Button onClick={handleAssignRestaurant}>
              <Check className="size-4" />
              Assign
            </Button>

            <CreateRestaurantDialog
              onCreated={(restaurantId) => {
                setSelectedRestaurantId(restaurantId.toString());
                toast.success("Restaurant created and selected");
              }}
            />
          </div>
        </div>
      )}

      {/* Parsed Items Table */}
      <div className="border rounded-lg bg-card overflow-hidden">
        <div className="p-6 border-b">
          <h3 className="text-lg font-semibold">
            Parsed Menu Items ({items.length})
          </h3>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="border-b bg-muted/50">
              <tr>
                <th className="text-left p-4 font-medium">Dish Name</th>
                <th className="text-left p-4 font-medium">Price</th>
                <th className="text-left p-4 font-medium">Category</th>
                <th className="text-left p-4 font-medium">Confidence</th>
                <th className="text-left p-4 font-medium">Description</th>
                {canReview && (
                  <th className="text-right p-4 font-medium">Actions</th>
                )}
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr key={item.id} className="border-b last:border-b-0">
                  <td className="p-4">
                    <div className="font-medium">{item.dishName}</div>
                  </td>
                  <td className="p-4">
                    <div className="font-mono">
                      {Number.parseFloat(item.priceEur).toFixed(2)} €
                    </div>
                  </td>
                  <td className="p-4">
                    <div className="text-sm text-muted-foreground">
                      {item.category || "—"}
                    </div>
                  </td>
                  <td className="p-4">
                    <div className="text-sm">
                      {item.priceConfidence
                        ? `${(Number.parseFloat(item.priceConfidence) * 100).toFixed(0)}%`
                        : "—"}
                    </div>
                  </td>
                  <td className="p-4 max-w-xs">
                    <div className="text-sm text-muted-foreground truncate">
                      {item.description || "—"}
                    </div>
                  </td>
                  {canReview && (
                    <td className="p-4">
                      <div className="flex justify-end gap-2">
                        <Button
                          size="sm"
                          variant={
                            itemActions[item.id] === "ACCEPT"
                              ? "default"
                              : "outline"
                          }
                          onClick={() => handleItemAction(item.id, "ACCEPT")}
                        >
                          <Check className="size-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleItemAction(item.id, "EDIT")}
                        >
                          <Edit className="size-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant={
                            itemActions[item.id] === "REJECT"
                              ? "destructive"
                              : "outline"
                          }
                          onClick={() => handleItemAction(item.id, "REJECT")}
                        >
                          <X className="size-4" />
                        </Button>
                      </div>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Batch Actions */}
      {canReview && (
        <div className="flex justify-end gap-4">
          <Button variant="outline" onClick={handleReject}>
            Reject Batch
          </Button>
          <Button onClick={handleApprove}>Approve & Publish</Button>
        </div>
      )}
    </div>
  );
}
