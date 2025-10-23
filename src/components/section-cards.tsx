import type { LucideIcon } from "lucide-react";
import {
  ArrowUpRight,
  HandCoins,
  PiggyBank,
  Sparkles,
  UtensilsCrossed,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardAction,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

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
    <div className="*:data-[slot=card]:from-primary/5 *:data-[slot=card]:to-card dark:*:data-[slot=card]:bg-card grid grid-cols-1 gap-4 px-4 *:data-[slot=card]:bg-gradient-to-t *:data-[slot=card]:shadow-xs lg:px-6 @xl/main:grid-cols-2 @5xl/main:grid-cols-4">
      {overviewCards.map((card) => (
        <Card key={card.title} className="@container/card">
          <CardHeader>
            <CardDescription>{card.title}</CardDescription>
            <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
              {card.value}
            </CardTitle>
            <CardAction>
              <Badge variant="outline" className="gap-1.5">
                <card.icon className="size-4" />
                {card.badgeLabel}
              </Badge>
            </CardAction>
          </CardHeader>
          <CardFooter className="flex-col items-start gap-1.5 text-sm">
            <div className="line-clamp-2 flex gap-2 font-medium">
              <Sparkles className="size-4" />
              {card.description}
            </div>
          </CardFooter>
        </Card>
      ))}
    </div>
  );
}
