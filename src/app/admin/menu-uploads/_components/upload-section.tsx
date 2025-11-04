"use client";

import { useState, useRef } from "react";
import { useFormStatus } from "react-dom";
import { Button } from "@/components/ui/button";
import { Upload } from "lucide-react";
import { toast } from "sonner";

function SubmitButton() {
  const { pending } = useFormStatus();

  return (
    <Button type="submit" disabled={pending}>
      <Upload className="size-4" />
      {pending ? "Uploading..." : "Upload PDF"}
    </Button>
  );
}

export function UploadSection() {
  const [file, setFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);

    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile?.type === "application/pdf") {
      setFile(droppedFile);
    } else {
      toast.error("Please upload a PDF file");
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
    }
  };

  const handleSubmit = async (formData: FormData) => {
    try {
      // Call server action via fetch to API route
      const response = await fetch("/api/admin/menu-upload", {
        method: "POST",
        body: formData,
      });

      const result = await response.json();

      if (result.success) {
        toast.success(result.message);
        if (result.warnings && result.warnings.length > 0) {
          for (const warning of result.warnings) {
            toast.warning(warning);
          }
        }
        setFile(null);
        if (fileInputRef.current) {
          fileInputRef.current.value = "";
        }
        // Navigate to the new batch's review page
        window.location.href = `/admin/menu-uploads/${result.batchId}`;
      } else {
        toast.error(result.message || "Upload failed");
        if (result.error) {
          toast.error(result.error);
        }
      }
    } catch (error) {
      toast.error("Upload failed");
      console.error(error);
    }
  };

  return (
    <div className="border rounded-lg p-6 bg-card">
      <h3 className="text-lg font-semibold mb-4">Upload Menu PDF</h3>

      <form action={handleSubmit}>
        <div
          className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
            isDragging
              ? "border-primary bg-primary/5"
              : "border-border hover:border-primary/50"
          }`}
          onDragOver={(e) => {
            e.preventDefault();
            setIsDragging(true);
          }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={handleDrop}
        >
          <Upload className="size-12 mx-auto mb-4 text-muted-foreground" />

          {file ? (
            <div className="mb-4">
              <p className="font-medium">{file.name}</p>
              <p className="text-sm text-muted-foreground">
                {(file.size / 1024 / 1024).toFixed(2)} MB
              </p>
            </div>
          ) : (
            <div className="mb-4">
              <p className="font-medium mb-2">
                Drag and drop a PDF file here, or click to browse
              </p>
              <p className="text-sm text-muted-foreground">
                Maximum file size: 50MB
              </p>
            </div>
          )}

          <input
            ref={fileInputRef}
            type="file"
            name="pdf"
            accept="application/pdf,.pdf"
            onChange={handleFileChange}
            className="hidden"
            id="pdf-upload"
          />

          <label htmlFor="pdf-upload">
            <Button type="button" variant="outline" asChild>
              <span>Choose File</span>
            </Button>
          </label>
        </div>

        {file && (
          <div className="mt-4 flex justify-end">
            <SubmitButton />
          </div>
        )}
      </form>
    </div>
  );
}
