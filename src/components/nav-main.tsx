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
  onNavigate,
}: {
  items: NavMainItem[];
  onNavigate?: (view: string) => void;
}) {
  const handleClick = (title: string) => {
    if (title === "Restaurants") {
      onNavigate?.("restaurants");
    } else if (title === "Restaurant-Vergleich") {
      onNavigate?.("comparison");
    } else if (title === "Markenleihen") {
      onNavigate?.("lending");
    } else {
      onNavigate?.("dashboard");
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
                <a href="#">
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
