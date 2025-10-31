"use client";

import * as React from "react";
import type { LucideIcon } from "lucide-react";

import {
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";

type NavSecondaryItem = {
  title: string;
  url: string;
  icon: LucideIcon;
};

export function NavSecondary({
  items,
  onNavigateAction,
  ...props
}: {
  items: NavSecondaryItem[];
  onNavigateAction?: (
    view:
      | "dashboard"
      | "restaurants"
      | "stats"
      | "history"
      | "comparison"
      | "lending",
  ) => void;
} & React.ComponentPropsWithoutRef<typeof SidebarGroup>) {
  const handleClick = (title: string) => {
    if (title === "Stats") {
      onNavigateAction?.("stats");
    } else if (title === "History") {
      onNavigateAction?.("history");
    }
  };

  return (
    <SidebarGroup {...props}>
      <SidebarGroupLabel>Werkzeuge</SidebarGroupLabel>
      <SidebarGroupContent>
        <SidebarMenu>
          {items.map((item) => (
            <SidebarMenuItem key={item.title}>
              <SidebarMenuButton
                asChild
                onClick={() => handleClick(item.title)}
              >
                <a href="#" onClick={(e) => e.preventDefault()}>
                  <item.icon className="size-4" />
                  <span>{item.title}</span>
                </a>
              </SidebarMenuButton>
            </SidebarMenuItem>
          ))}
        </SidebarMenu>
      </SidebarGroupContent>
    </SidebarGroup>
  );
}
