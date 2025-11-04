"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Users,
  Database,
  FileText,
  Ticket,
  LayoutDashboard,
  LogOut,
  Upload,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { logout } from "@/actions/logout";
import { Separator } from "@/components/ui/separator";
import { useFormState } from "react-dom";

interface AdminSidebarProps {
  userName: string;
}

const navItems = [
  {
    title: "Übersicht",
    href: "/admin",
    icon: LayoutDashboard,
  },
  {
    title: "Benutzerverwaltung",
    href: "/admin/users",
    icon: Users,
  },
  {
    title: "Menü-Uploads",
    href: "/admin/menu-uploads",
    icon: Upload,
  },
  {
    title: "Tickets",
    href: "/admin/tickets",
    icon: Ticket,
  },
  {
    title: "Datenbank-Backups",
    href: "/admin/backups",
    icon: Database,
  },
  {
    title: "Anwendungslogs",
    href: "/admin/logs",
    icon: FileText,
  },
];

export function AdminSidebar({ userName }: AdminSidebarProps) {
  const pathname = usePathname();
  const [, logoutFormAction] = useFormState(logout, { error: undefined });

  return (
    <aside className="w-64 border-r bg-card">
      <div className="flex h-full flex-col">
        {/* Header */}
        <div className="p-6">
          <h1 className="text-2xl font-bold text-primary">Admin Panel</h1>
          <p className="text-sm text-muted-foreground mt-1">{userName}</p>
        </div>

        <Separator />

        {/* Navigation */}
        <nav className="flex-1 space-y-1 p-4">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href;

            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors",
                  isActive
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:bg-accent hover:text-accent-foreground",
                )}
              >
                <Icon className="size-4" />
                {item.title}
              </Link>
            );
          })}
        </nav>

        <Separator />

        {/* Footer */}
        <div className="p-4 space-y-2">
          <Link href="/dashboard">
            <Button
              variant="outline"
              className="w-full justify-start"
              size="sm"
            >
              <LayoutDashboard className="size-4 mr-2" />
              Zum Dashboard
            </Button>
          </Link>
          <form action={logoutFormAction}>
            <Button
              type="submit"
              variant="ghost"
              className="w-full justify-start"
              size="sm"
            >
              <LogOut className="size-4 mr-2" />
              Abmelden
            </Button>
          </form>
        </div>
      </div>
    </aside>
  );
}
