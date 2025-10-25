import type { LucideIcon } from "lucide-react";
import {
  ArrowUpRight,
  HandCoins,
  PiggyBank,
  Sparkles,
  UtensilsCrossed,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { ProfileCard } from "@/components/profile-card";

const overviewCards = [
  {
    title: "Marken im Umlauf",
    value: "480",
    badgeLabel: "+18 heute",
    description: "Neue Ausgaben in den Teams",
    icon: HandCoins,
  },
  {
    title: "Verfügbare Marken",
    value: "126",
    badgeLabel: "Reserve 24",
    description: "Noch nicht ausgegebene Kontingente",
    icon: PiggyBank,
  },
  {
    title: "Ø Preis pro Gericht",
    value: "€9,80",
    badgeLabel: "-12% ggü. Bargeld",
    description: "Durchschnitt aller Restaurants",
    icon: ArrowUpRight,
  },
  {
    title: "Aktive Restaurants",
    value: "12",
    badgeLabel: "3 neue Partner",
    description: "Letzte Aktualisierung heute 11:40",
    icon: UtensilsCrossed,
  },
] satisfies {
  title: string;
  value: string;
  badgeLabel: string;
  description: string;
  icon: LucideIcon;
}[];

export function SectionCards() {
  return (
    <div className="grid grid-cols-1 gap-4 px-4 lg:px-6 @xl/main:grid-cols-2 @5xl/main:grid-cols-4">
      {overviewCards.map((card) => (
        <ProfileCard key={card.title} className="@container/card">
          <div className="flex flex-col gap-3">
            <div className="flex items-start justify-between">
              <div className="flex flex-col gap-2">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  {card.title}
                </p>
                <p className="text-2xl font-bold tabular-nums text-foreground @[250px]/card:text-3xl">
                  {card.value}
                </p>
              </div>
              <card.icon className="size-5 text-muted-foreground opacity-60" />
            </div>
            <Badge variant="outline" className="w-fit gap-1.5">
              <card.icon className="size-4" />
              {card.badgeLabel}
            </Badge>
            <div className="flex gap-2 text-xs text-muted-foreground">
              <Sparkles className="size-3.5 mt-0.5 flex-shrink-0" />
              <span className="line-clamp-2">{card.description}</span>
            </div>
          </div>
        </ProfileCard>
      ))}
    </div>
  );
}
