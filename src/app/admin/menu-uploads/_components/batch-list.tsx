"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Eye } from "lucide-react";

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
              <td className="p-4 text-sm">{batch.uploadedByName || "Unknown"}</td>
              <td className="p-4 text-sm text-muted-foreground">
                {new Date(batch.createdAt).toLocaleString("de-DE")}
              </td>
              <td className="p-4 text-right">
                <Button variant="ghost" size="sm" asChild>
                  <Link href={`/admin/menu-uploads/${batch.id}`}>
                    <Eye className="size-4" />
                    Review
                  </Link>
                </Button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
