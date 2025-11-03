"use client";

import { use, useState } from "react";
import { Download, Upload, History, AlertCircle, Database } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { createDatabaseBackup, restoreDatabaseBackup } from "@/actions/admin/database-backup";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";

interface Backup {
  id: number;
  filename: string;
  fileSize: number;
  createdAt: Date;
  adminName: string | null;
  adminEmail: string | null;
}

interface BackupManagementClientProps {
  backupHistoryPromise: Promise<{
    success: boolean;
    backups?: Backup[];
    error?: string;
  }>;
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(2)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

export function BackupManagementClient({ backupHistoryPromise }: BackupManagementClientProps) {
  const historyResult = use(backupHistoryPromise);
  const [isCreatingBackup, setIsCreatingBackup] = useState(false);
  const [isRestoring, setIsRestoring] = useState(false);

  const handleCreateBackup = async () => {
    setIsCreatingBackup(true);
    try {
      const result = await createDatabaseBackup();
      
      if (result.success && result.data && result.filename) {
        // Trigger download
        const link = document.createElement("a");
        link.href = `data:text/plain;base64,${result.data}`;
        link.download = result.filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        toast.success("Backup erfolgreich erstellt und heruntergeladen");
        // Reload page to refresh backup history
        window.location.reload();
      } else {
        toast.error(result.error || "Fehler beim Erstellen des Backups");
      }
    } catch (error) {
      toast.error("Fehler beim Erstellen des Backups");
      console.error(error);
    } finally {
      setIsCreatingBackup(false);
    }
  };

  const handleRestoreBackup = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.name.endsWith(".sql")) {
      toast.error("Bitte wählen Sie eine .sql Datei aus");
      return;
    }

    const confirmRestore = window.confirm(
      "WARNUNG: Das Wiederherstellen eines Backups überschreibt ALLE aktuellen Daten. Möchten Sie fortfahren?"
    );

    if (!confirmRestore) return;

    setIsRestoring(true);
    try {
      const reader = new FileReader();
      reader.onload = async (event) => {
        const content = event.target?.result as string;
        const base64Data = btoa(content);

        const formData = new FormData();
        formData.append("backupData", base64Data);
        formData.append("filename", file.name);

        const result = await restoreDatabaseBackup(formData);

        if (result.success) {
          toast.success("Backup erfolgreich wiederhergestellt");
          setTimeout(() => {
            window.location.reload();
          }, 2000);
        } else {
          toast.error(result.error || "Fehler beim Wiederherstellen des Backups");
        }
        setIsRestoring(false);
      };
      reader.onerror = () => {
        toast.error("Fehler beim Lesen der Datei");
        setIsRestoring(false);
      };
      reader.readAsText(file);
    } catch (error) {
      toast.error("Fehler beim Wiederherstellen des Backups");
      console.error(error);
      setIsRestoring(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Actions Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="size-5" />
            Backup-Verwaltung
          </CardTitle>
          <CardDescription>
            Erstellen Sie Backups Ihrer PostgreSQL-Datenbank oder spielen Sie diese ein
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <Button onClick={handleCreateBackup} disabled={isCreatingBackup}>
              <Download className="size-4" />
              {isCreatingBackup ? "Erstelle Backup..." : "Backup erstellen"}
            </Button>
            <Button variant="outline" disabled={isRestoring} asChild>
              <label className="cursor-pointer">
                <Upload className="size-4" />
                {isRestoring ? "Stelle wieder her..." : "Backup einspielen"}
                <input
                  type="file"
                  accept=".sql"
                  className="hidden"
                  onChange={handleRestoreBackup}
                  disabled={isRestoring}
                />
              </label>
            </Button>
          </div>

          <div className="rounded-lg border border-amber-500/20 bg-amber-500/10 p-4">
            <div className="flex gap-3">
              <AlertCircle className="size-5 text-amber-500 flex-shrink-0" />
              <div className="space-y-1 text-sm">
                <p className="font-medium text-amber-900 dark:text-amber-100">
                  Wichtiger Hinweis
                </p>
                <p className="text-amber-800 dark:text-amber-200">
                  Das Wiederherstellen eines Backups überschreibt alle aktuellen Daten in der
                  Datenbank. Erstellen Sie vorher ein Backup des aktuellen Zustands.
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Backup History */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <History className="size-5" />
            Backup-Historie
          </CardTitle>
          <CardDescription>
            Liste der letzten 50 erstellten Backups
          </CardDescription>
        </CardHeader>
        <CardContent>
          {!historyResult.success || !historyResult.backups ? (
            <p className="text-center text-muted-foreground py-6">
              {historyResult.error || "Fehler beim Laden der Historie"}
            </p>
          ) : historyResult.backups.length === 0 ? (
            <p className="text-center text-muted-foreground py-6">
              Noch keine Backups erstellt
            </p>
          ) : (
            <div className="space-y-3">
              {historyResult.backups.map((backup) => (
                <div
                  key={backup.id}
                  className="flex items-center justify-between rounded-lg border p-3 hover:bg-muted/50"
                >
                  <div className="flex-1">
                    <p className="font-medium">{backup.filename}</p>
                    <p className="text-sm text-muted-foreground">
                      Erstellt am{" "}
                      {new Date(backup.createdAt).toLocaleDateString("de-DE", {
                        day: "2-digit",
                        month: "2-digit",
                        year: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                      {backup.adminName && ` von ${backup.adminName}`}
                    </p>
                  </div>
                  <Badge variant="secondary">{formatFileSize(backup.fileSize)}</Badge>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
