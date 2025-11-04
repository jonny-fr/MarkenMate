import { redirect } from "next/navigation";
import { getServerSession } from "@/lib/auth-server";
import { db } from "@/db";
import { user } from "@/db/schema";
import { eq } from "drizzle-orm";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { AccountSettingsClient } from "./_components/account-settings-client";

export const metadata = {
  title: "Account-Einstellungen | MarkenMate",
  description: "Verwalte deine Account-Einstellungen",
};

export default async function AccountSettingsPage() {
  const session = await getServerSession();

  if (!session?.user?.id) {
    redirect("/login");
  }

  // Get user details
  const [userDetails] = await db
    .select({
      email: user.email,
      name: user.name,
    })
    .from(user)
    .where(eq(user.id, session.user.id))
    .limit(1);

  if (!userDetails) {
    redirect("/login");
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto max-w-4xl py-8 px-4">
        {/* Header */}
        <div className="mb-6 flex items-center gap-4">
          <Button asChild variant="ghost" size="icon">
            <Link href="/dashboard">
              <ArrowLeft className="size-4" />
            </Link>
          </Button>
          <div>
            <h1 className="text-3xl font-bold">Account-Einstellungen</h1>
            <p className="text-muted-foreground">
              Verwalte deine persönlichen Informationen
            </p>
          </div>
        </div>

        {/* Client Component with Forms */}
        <AccountSettingsClient
          currentEmail={userDetails.email}
          currentUsername={userDetails.name}
        />
      </div>
    </div>
  );
}
