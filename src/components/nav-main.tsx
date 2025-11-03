"use client";

import type { LucideIcon } from "lucide-react";

import {
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";

type NavMainItem = {
  title: string;
  url: string;
  icon: LucideIcon;
};

export function NavMain({
  items,
  onNavigateAction,
}: {
  items: NavMainItem[];
  onNavigateAction?: (
    view:
      | "dashboard"
      | "restaurants"
      | "stats"
      | "history"
      | "comparison"
      | "lending"
      | "favorites",
  ) => void;
}) {
  const handleClick = (title: string) => {
    if (title === "Restaurants") {
      onNavigateAction?.("restaurants");
    } else if (title === "Favoriten") {
      onNavigateAction?.("favorites");
    } else if (title === "Restaurant-Vergleich") {
      onNavigateAction?.("comparison");
    } else if (title === "Markenleihen") {
      onNavigateAction?.("lending");
    } else {
      onNavigateAction?.("dashboard");
    }
  };

  return (
    <SidebarGroup>
      <SidebarGroupLabel>Bereiche</SidebarGroupLabel>
      <SidebarGroupContent>
        <SidebarMenu>
          {items.map((item) => (
            <SidebarMenuItem key={item.title}>
              <SidebarMenuButton
                asChild
                tooltip={item.title}
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
