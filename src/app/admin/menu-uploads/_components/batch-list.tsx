"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Eye, Trash2 } from "lucide-react";
import { useTransition } from "react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

interface Batch {
  id: number;
  filename: string;
  status: string;
  fileSize: number;
  uploadedByName: string | null;
  createdAt: Date;
  updatedAt: Date;
}

interface BatchListProps {
  batches: Batch[];
}

const statusColors: Record<string, string> = {
  UPLOADED: "bg-blue-500/10 text-blue-500",
  PARSING: "bg-yellow-500/10 text-yellow-500",
  PARSED: "bg-green-500/10 text-green-500",
  PARSE_FAILED: "bg-red-500/10 text-red-500",
  CHANGES_PROPOSED: "bg-purple-500/10 text-purple-500",
  APPROVED: "bg-indigo-500/10 text-indigo-500",
  PUBLISHING: "bg-yellow-500/10 text-yellow-500",
  PUBLISHED: "bg-green-600/10 text-green-600",
  REJECTED: "bg-red-600/10 text-red-600",
};

export function BatchList({ batches }: BatchListProps) {
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  const handleDelete = async (batchId: number, filename: string) => {
    if (
      !confirm(
        `Are you sure you want to delete "${filename}"? This action cannot be undone.`,
      )
    ) {
      return;
    }

    startTransition(async () => {
      try {
        const response = await fetch("/api/admin/menu-batch/delete", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ batchId }),
        });

        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.message || "Failed to delete batch");
        }

        toast.success("Batch deleted successfully");
        router.refresh();
      } catch (error) {
        toast.error(
          error instanceof Error ? error.message : "Failed to delete batch",
        );
      }
    });
  };

  if (batches.length === 0) {
    return (
      <div className="text-center py-12 border rounded-lg bg-card">
        <p className="text-muted-foreground">No uploads yet</p>
      </div>
    );
  }

  return (
    <div className="border rounded-lg bg-card overflow-hidden">
      <table className="w-full">
        <thead className="border-b bg-muted/50">
          <tr>
            <th className="text-left p-4 font-medium">Filename</th>
            <th className="text-left p-4 font-medium">Status</th>
            <th className="text-left p-4 font-medium">Size</th>
            <th className="text-left p-4 font-medium">Uploaded By</th>
            <th className="text-left p-4 font-medium">Uploaded</th>
            <th className="text-right p-4 font-medium">Actions</th>
          </tr>
        </thead>
        <tbody>
          {batches.map((batch) => (
            <tr key={batch.id} className="border-b last:border-b-0">
              <td className="p-4">
                <div className="font-medium">{batch.filename}</div>
              </td>
              <td className="p-4">
                <span
                  className={`px-2 py-1 rounded-md text-xs font-medium ${
                    statusColors[batch.status] || "bg-gray-500/10 text-gray-500"
                  }`}
                >
                  {batch.status}
                </span>
              </td>
              <td className="p-4 text-sm text-muted-foreground">
                {(batch.fileSize / 1024 / 1024).toFixed(2)} MB
              </td>
              <td className="p-4 text-sm">
                {batch.uploadedByName || "Unknown"}
              </td>
              <td className="p-4 text-sm text-muted-foreground">
                {new Date(batch.createdAt).toLocaleString("de-DE")}
              </td>
              <td className="p-4 text-right">
                <div className="flex gap-2 justify-end">
                  <Button variant="ghost" size="sm" asChild>
                    <Link href={`/admin/menu-uploads/${batch.id}`}>
                      <Eye className="size-4" />
                      Review
                    </Link>
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDelete(batch.id, batch.filename)}
                    disabled={isPending}
                    className="text-destructive hover:text-destructive hover:bg-destructive/10"
                  >
                    <Trash2 className="size-4" />
                  </Button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
