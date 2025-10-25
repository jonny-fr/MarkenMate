"use client";

import * as React from "react";
import { TrendingUp } from "lucide-react";
import { Area, AreaChart, CartesianGrid, XAxis } from "recharts";

import { useIsMobile } from "@/hooks/use-mobile";
import { AuroraBackground } from "@/components/aurora";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  type ChartConfig,
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ToggleGroup,
  ToggleGroupItem,
} from "@/components/ui/toggle-group";

const restaurantKeys = ["pastaLoft", "greenBowl", "burgerWerk"] as const;

type RestaurantKey = (typeof restaurantKeys)[number];

const consumptionData: Array<
  { period: string } & Record<RestaurantKey, number>
> = [
  { period: "KW 19", pastaLoft: 58, greenBowl: 36, burgerWerk: 41 },
  { period: "KW 20", pastaLoft: 62, greenBowl: 40, burgerWerk: 47 },
  { period: "KW 21", pastaLoft: 65, greenBowl: 38, burgerWerk: 49 },
  { period: "KW 22", pastaLoft: 71, greenBowl: 45, burgerWerk: 52 },
  { period: "KW 23", pastaLoft: 75, greenBowl: 48, burgerWerk: 56 },
  { period: "KW 24", pastaLoft: 78, greenBowl: 52, burgerWerk: 58 },
  { period: "KW 25", pastaLoft: 82, greenBowl: 55, burgerWerk: 61 },
  { period: "KW 26", pastaLoft: 79, greenBowl: 50, burgerWerk: 63 },
  { period: "KW 27", pastaLoft: 84, greenBowl: 53, burgerWerk: 66 },
  { period: "KW 28", pastaLoft: 88, greenBowl: 57, burgerWerk: 69 },
  { period: "KW 29", pastaLoft: 91, greenBowl: 60, burgerWerk: 72 },
  { period: "KW 30", pastaLoft: 95, greenBowl: 62, burgerWerk: 74 },
];

const chartConfig = {
  pastaLoft: {
    label: "Pasta Loft",
    color: "var(--chart-1)",
  },
  greenBowl: {
    label: "Green Bowl",
    color: "var(--chart-2)",
  },
  burgerWerk: {
    label: "Burger Werk",
    color: "var(--chart-3)",
  },
} satisfies ChartConfig;

const RANGE_OPTIONS = [
  { value: "12w", label: "12 Wochen" },
  { value: "8w", label: "8 Wochen" },
  { value: "4w", label: "4 Wochen" },
] as const;

type RangeValue = (typeof RANGE_OPTIONS)[number]["value"];

const RANGE_LOOKUP: Record<RangeValue, number> = {
  "12w": 12,
  "8w": 8,
  "4w": 4,
};

export function ChartAreaInteractive() {
  const isMobile = useIsMobile();
  const [timeRange, setTimeRange] = React.useState<RangeValue>("12w");

  React.useEffect(() => {
    if (isMobile) {
      setTimeRange("4w");
    }
  }, [isMobile]);

  const filteredData = React.useMemo(() => {
    const sliceAmount = RANGE_LOOKUP[timeRange];
    return consumptionData.slice(-sliceAmount);
  }, [timeRange]);

  const totals = React.useMemo(() => {
    return filteredData.reduce<Record<RestaurantKey, number>>(
      (acc, entry) => {
        for (const key of restaurantKeys) {
          acc[key] += entry[key];
        }
        return acc;
      },
      { pastaLoft: 0, greenBowl: 0, burgerWerk: 0 }
    );
  }, [filteredData]);

  const leadingKey = React.useMemo(() => {
    let currentKey: RestaurantKey = restaurantKeys[0];
    for (const key of restaurantKeys) {
      if (totals[key] > totals[currentKey]) {
        currentKey = key;
      }
    }
    return currentKey;
  }, [totals]);

  const leadingLabel =
    chartConfig[leadingKey]?.label ?? leadingKey.toString();

  const rangeLabel =
    RANGE_OPTIONS.find((option) => option.value === timeRange)?.label ??
    "Zeitraum";

  const numberFormatter = React.useMemo(
    () => new Intl.NumberFormat("de-DE"),
    []
  );

  return (
    <AuroraBackground className="rounded-2xl">
      <Card className="border-none bg-transparent backdrop-blur-sm @container/card" id="comparison">
        <CardHeader>
          <CardTitle className="text-muted-foreground">Restaurant-Vergleich</CardTitle>
          <CardDescription>
            Markenverbrauch pro Woche im ausgewählten Zeitraum
          </CardDescription>
          <CardAction className="gap-2">
            <ToggleGroup
              type="single"
              value={timeRange}
              onValueChange={(value) => {
                if (value) {
                  setTimeRange(value as RangeValue);
                }
              }}
              variant="outline"
              className="hidden @[767px]/card:flex *:data-[slot=toggle-group-item]:!px-4 [&_button]:text-muted-foreground"
            >
              {RANGE_OPTIONS.map((option) => (
                <ToggleGroupItem key={option.value} value={option.value}>
                  {option.label}
                </ToggleGroupItem>
              ))}
            </ToggleGroup>
            <Select
              value={timeRange}
              onValueChange={(value) => setTimeRange(value as RangeValue)}
            >
              <SelectTrigger className="flex w-40 @[767px]/card:hidden text-muted-foreground">
                <SelectValue placeholder="Zeitraum auswählen" />
              </SelectTrigger>
              <SelectContent className="rounded-xl">
                {RANGE_OPTIONS.map((option) => (
                  <SelectItem
                    key={option.value}
                    value={option.value}
                    className="rounded-lg"
                  >
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </CardAction>
        </CardHeader>
        <CardContent className="space-y-4">
          <ChartContainer config={chartConfig}>
            <AreaChart data={filteredData}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(148, 163, 184, 0.2)" />
              <XAxis
                dataKey="period"
                tickLine={false}
                axisLine={false}
                tickMargin={8}
                stroke="rgba(148, 163, 184, 0.6)"
              />
              <ChartTooltip
                cursor={{ stroke: "rgba(168, 85, 247, 0.3)" }}
                content={
                  <ChartTooltipContent
                    indicator="dot"
                    contentStyle={{
                      backgroundColor: "rgba(15, 15, 25, 0.9)",
                      border: "1px solid rgba(168, 85, 247, 0.3)",
                      borderRadius: "0.5rem",
                      backdropFilter: "blur(8px)",
                    }}
                    labelStyle={{ color: "rgba(148, 163, 184, 0.8)" }}
                  />
                }
              />
              <ChartLegend
                verticalAlign="top"
                content={<ChartLegendContent className="pt-0 [&_*]:!text-muted-foreground" />}
              />
              <Area
                dataKey="pastaLoft"
                type="monotone"
                stroke="var(--color-pastaLoft)"
                fill="var(--color-pastaLoft)"
                fillOpacity={0.2}
                strokeWidth={2}
                dot={false}
              />
              <Area
                dataKey="greenBowl"
                type="monotone"
                stroke="var(--color-greenBowl)"
                fill="var(--color-greenBowl)"
                fillOpacity={0.2}
                strokeWidth={2}
                dot={false}
              />
              <Area
                dataKey="burgerWerk"
                type="monotone"
                stroke="var(--color-burgerWerk)"
                fill="var(--color-burgerWerk)"
                fillOpacity={0.2}
                strokeWidth={2}
                dot={false}
              />
            </AreaChart>
          </ChartContainer>
          <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
            <Badge variant="outline" className="gap-1.5 text-muted-foreground">
              <TrendingUp className="size-4" />
              {leadingLabel} führt mit{" "}
              {numberFormatter.format(totals[leadingKey])} Marken
            </Badge>
            <span className="text-muted-foreground">{rangeLabel}</span>
          </div>
        </CardContent>
      </Card>
    </AuroraBackground>
  );
}
