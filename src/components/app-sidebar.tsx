"use client";

import type { ComponentProps } from "react";
import {
  Building2,
  ChartPie,
  Clock,
  HandCoins,
  UtensilsCrossed,
  BarChart3,
} from "lucide-react";

import { NavMain } from "@/components/nav-main";
import { NavSecondary } from "@/components/nav-secondary";
import { NavUser } from "@/components/nav-user";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";

const sidebarData = {
  user: {
    name: "Nora Marken",
    email: "nora@markenmate.de",
    avatar: "/avatars/shadcn.jpg",
  },
  navigation: [
    {
      title: "Restaurants",
      url: "#restaurants",
      icon: UtensilsCrossed,
    },
    {
      title: "Restaurant-Vergleich",
      url: "#comparison",
      icon: ChartPie,
    },
    {
      title: "Markenleihen",
      url: "#lending",
      icon: HandCoins,
    },
  ],
  secondary: [
    {
      title: "Stats",
      url: "#stats",
      icon: BarChart3,
    },
    {
      title: "History",
      url: "#history",
      icon: Clock,
    },
  ],
};

export function AppSidebar({
  onNavigateAction,
  ...props
}: ComponentProps<typeof Sidebar> & {
  onNavigateAction?: (view: "dashboard" | "restaurants" | "stats" | "history" | "comparison" | "lending") => void;
}) {
  return (
    <Sidebar collapsible="offcanvas" {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              asChild
              className="data-[slot=sidebar-menu-button]:!p-1.5"
            >
              <a
                href="#"
                onClick={(e) => {
                  e.preventDefault();
                  onNavigateAction?.("dashboard");
                }}
              >
                <Building2 className="size-5" />
                <span className="text-base font-semibold">MarkenMate</span>
              </a>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <NavMain
          items={sidebarData.navigation}
          onNavigateAction={onNavigateAction}
        />
        <NavSecondary
          items={sidebarData.secondary}
          onNavigateAction={onNavigateAction}
          className="mt-auto"
        />
      </SidebarContent>
      <SidebarFooter>
        <NavUser user={sidebarData.user} />
      </SidebarFooter>
    </Sidebar>
  );
}
