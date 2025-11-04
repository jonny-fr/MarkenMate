"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { RefreshCcw } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { toast } from "sonner";

export function SiteHeader() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleRefresh = () => {
    setIsRefreshing(true);
    startTransition(() => {
      router.refresh();
      // Reset loading state after a short delay
      setTimeout(() => {
        setIsRefreshing(false);
        toast.success("Seite aktualisiert");
      }, 500);
    });
  };

  return (
    <header className="flex h-(--header-height) shrink-0 items-center gap-2 border-b transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-(--header-height)">
      <div className="flex w-full items-center gap-1 px-4 lg:gap-2 lg:px-6">
        <SidebarTrigger className="-ml-1" />
        <Separator
          orientation="vertical"
          className="mx-2 data-[orientation=vertical]:h-4"
        />
        <div className="flex flex-col gap-0.5">
          <h1 className="text-base font-semibold">Essensmarken Cockpit</h1>
          <span className="text-xs text-muted-foreground">
            Überblick über Restaurants, Marken und Auslastung
          </span>
        </div>
        <div className="ml-auto flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            className="hidden sm:flex"
            onClick={handleRefresh}
            disabled={isRefreshing || isPending}
          >
            <RefreshCcw
              className={`size-4 ${isRefreshing || isPending ? "animate-spin" : ""}`}
            />
            Aktualisieren
          </Button>
        </div>
      </div>
    </header>
  );
}
