"use client";

interface BatchDetailProps {
  batch: {
    id: number;
    filename: string;
    status: string;
    fileSize: number;
    isTextNative: boolean | null;
    parseLog: string | null;
    errorMessage: string | null;
    uploadedByName: string | null;
    createdAt: Date;
    updatedAt: Date;
  };
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

export function BatchDetail({ batch }: BatchDetailProps) {
  const parseLog = batch.parseLog ? JSON.parse(batch.parseLog) : null;

  return (
    <div className="border rounded-lg p-6 bg-card space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">Batch Information</h2>
        <span
          className={`px-3 py-1 rounded-md text-sm font-medium ${
            statusColors[batch.status] || "bg-gray-500/10 text-gray-500"
          }`}
        >
          {batch.status}
        </span>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <dt className="text-sm text-muted-foreground">Filename</dt>
          <dd className="font-medium">{batch.filename}</dd>
        </div>

        <div>
          <dt className="text-sm text-muted-foreground">File Size</dt>
          <dd className="font-medium">
            {(batch.fileSize / 1024 / 1024).toFixed(2)} MB
          </dd>
        </div>

        <div>
          <dt className="text-sm text-muted-foreground">Text Native</dt>
          <dd className="font-medium">
            {batch.isTextNative === null
              ? "Unknown"
              : batch.isTextNative
                ? "Yes (Direct text)"
                : "No (OCR required)"}
          </dd>
        </div>

        <div>
          <dt className="text-sm text-muted-foreground">Uploaded By</dt>
          <dd className="font-medium">{batch.uploadedByName || "Unknown"}</dd>
        </div>

        <div>
          <dt className="text-sm text-muted-foreground">Uploaded At</dt>
          <dd className="font-medium">
            {new Date(batch.createdAt).toLocaleString("de-DE")}
          </dd>
        </div>

        <div>
          <dt className="text-sm text-muted-foreground">Last Updated</dt>
          <dd className="font-medium">
            {new Date(batch.updatedAt).toLocaleString("de-DE")}
          </dd>
        </div>
      </div>

      {parseLog && (
        <div className="border-t pt-4 mt-4">
          <h3 className="font-semibold mb-2">Parse Details</h3>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <dt className="text-muted-foreground">Total Pages</dt>
              <dd className="font-medium">{parseLog.totalPages}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Items Found</dt>
              <dd className="font-medium">{parseLog.itemsFound}</dd>
            </div>
          </div>

          {parseLog.warnings && parseLog.warnings.length > 0 && (
            <div className="mt-3">
              <dt className="text-muted-foreground text-sm mb-1">Warnings</dt>
              <ul className="list-disc list-inside text-sm space-y-1">
                {parseLog.warnings.map((warning: string, i: number) => (
                  <li key={i} className="text-yellow-600">
                    {warning}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {batch.errorMessage && (
        <div className="border-t pt-4 mt-4">
          <h3 className="font-semibold mb-2 text-red-500">Error</h3>
          <p className="text-sm text-red-600">{batch.errorMessage}</p>
        </div>
      )}
    </div>
  );
}
