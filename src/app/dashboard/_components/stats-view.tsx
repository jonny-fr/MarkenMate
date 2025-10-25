"use client";

import { use, useState } from "react";
import { TrendingDown, TrendingUp } from "lucide-react";
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { AuroraBackground } from "@/components/aurora";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export type StatsData = {
  lastMonthSpent: number;
  totalLendingBalance: number;
  spendingTrend: number;
};

export type GraphDataPoint = {
  date: string;
  spent: number;
  lent: number;
};

function StatCard({
  title,
  value,
  unit,
  trend,
  isTrendPositive,
}: {
  title: string;
  value: string | number;
  unit?: string;
  trend: number;
  isTrendPositive: boolean;
}) {
  return (
    <AuroraBackground className="rounded-lg">
      <Card className="flex-1 border-none bg-transparent backdrop-blur-sm">
        <CardContent className="pt-6">
          <div className="space-y-4">
            <p className="text-sm font-medium text-muted-foreground">{title}</p>
            <div className="space-y-2">
              <div className="text-3xl font-bold text-muted-foreground">
                {value}
                {unit && <span className="text-lg ml-1">{unit}</span>}
              </div>
              <div className="flex items-center gap-2">
                {isTrendPositive ? (
                  <TrendingUp className="size-4 text-green-500" />
                ) : (
                  <TrendingDown className="size-4 text-red-500" />
                )}
                <span
                  className={`text-sm font-medium ${
                    isTrendPositive ? "text-green-500" : "text-red-500"
                  }`}
                >
                  {Math.abs(trend)}%
                </span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </AuroraBackground>
  );
}

export function StatsView({
  statsPromise,
  graphDataPromise,
  graphDataMonth,
  graphDataQuarter,
  graphDataYear,
}: {
  statsPromise: Promise<StatsData>;
  graphDataPromise: Promise<GraphDataPoint[]>;
  graphDataMonth: Promise<GraphDataPoint[]>;
  graphDataQuarter: Promise<GraphDataPoint[]>;
  graphDataYear: Promise<GraphDataPoint[]>;
}) {
  const stats = use(statsPromise);
  const graphDataWeek = use(graphDataPromise);
  const monthData = use(graphDataMonth);
  const quarterData = use(graphDataQuarter);
  const yearData = use(graphDataYear);

  const [chartContext, setChartContext] = useState("spending");
  const [chartDuration, setChartDuration] = useState("month");

  // Determine trends (positive or negative)
  const isSpendingTrendUp = stats.spendingTrend > 0;
  const totalLendingTrend = 5; // Example trend value
  const isTotalLendingUp = totalLendingTrend > 0;

  // Select data based on duration
  const getGraphData = () => {
    switch (chartDuration) {
      case "week":
        return graphDataWeek;
      case "month":
        return monthData;
      case "quarter":
        return quarterData;
      case "year":
        return yearData;
      default:
        return monthData;
    }
  };

  // Format data for display
  const formattedData = getGraphData().map((point) => ({
    ...point,
    dateShort: new Date(point.date).toLocaleDateString("de-DE", {
      month: "short",
      day: "numeric",
    }),
  }));

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-foreground">Stats</h1>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 grid-cols-1 md:grid-cols-3">
        <StatCard
          title="Letzten Monat ausgegeben"
          value={stats.lastMonthSpent.toFixed(2)}
          unit="€"
          trend={Math.abs(stats.spendingTrend)}
          isTrendPositive={isSpendingTrendUp}
        />
        <StatCard
          title="Gesamt Ver-/Geliehen"
          value={Math.abs(stats.totalLendingBalance)}
          trend={Math.abs(totalLendingTrend)}
          isTrendPositive={isTotalLendingUp}
        />
        <StatCard
          title="Aktuelle Trend beim Ausgeben"
          value={Math.abs(stats.spendingTrend)}
          unit="%"
          trend={Math.abs(stats.spendingTrend)}
          isTrendPositive={isSpendingTrendUp}
        />
      </div>

      {/* Graph Section */}
      <AuroraBackground className="rounded-lg">
        <Card className="border-none bg-transparent backdrop-blur-sm">
          <CardHeader>
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div>
                <CardTitle className="text-muted-foreground">Detaillierte Ausgaben</CardTitle>
              <CardDescription>
                Wählen Sie Kontext und Dauer zur Analyse
              </CardDescription>
            </div>
            <div className="flex gap-3 flex-col sm:flex-row">
              <Select value={chartContext} onValueChange={setChartContext}>
                <SelectTrigger className="w-full sm:w-[180px]">
                  <SelectValue placeholder="Kontext" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="spending">Ausgaben</SelectItem>
                  <SelectItem value="lending">Geliehen</SelectItem>
                  <SelectItem value="both">Beides</SelectItem>
                </SelectContent>
              </Select>
              <Select value={chartDuration} onValueChange={setChartDuration}>
                <SelectTrigger className="w-full sm:w-[180px]">
                  <SelectValue placeholder="Dauer" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="week">1 Woche</SelectItem>
                  <SelectItem value="month">1 Monat</SelectItem>
                  <SelectItem value="quarter">3 Monate</SelectItem>
                  <SelectItem value="year">1 Jahr</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="h-[400px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              {chartContext === "both" ? (
                <BarChart data={formattedData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="dateShort" />
                  <YAxis />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "var(--background)",
                      border: "1px solid var(--border)",
                      borderRadius: "0.5rem",
                    }}
                    labelStyle={{ color: "var(--foreground)" }}
                  />
                  <Legend />
                  <Bar dataKey="spent" fill="#3b82f6" name="Ausgegeben (€)" />
                  <Bar dataKey="lent" fill="#10b981" name="Geliehen" />
                </BarChart>
              ) : (
                <AreaChart data={formattedData}>
                  <defs>
                    <linearGradient id="colorSpent" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.8} />
                      <stop
                        offset="95%"
                        stopColor="#3b82f6"
                        stopOpacity={0.1}
                      />
                    </linearGradient>
                    <linearGradient id="colorLent" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.8} />
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0.1} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="dateShort" />
                  <YAxis />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "var(--background)",
                      border: "1px solid var(--border)",
                      borderRadius: "0.5rem",
                    }}
                    labelStyle={{ color: "var(--foreground)" }}
                  />
                  <Legend />
                  {(chartContext === "spending" || chartContext === "both") && (
                    <Area
                      type="monotone"
                      dataKey="spent"
                      stroke="#3b82f6"
                      fillOpacity={1}
                      fill="url(#colorSpent)"
                      name="Ausgegeben (€)"
                    />
                  )}
                  {(chartContext === "lending" || chartContext === "both") && (
                    <Area
                      type="monotone"
                      dataKey="lent"
                      stroke="#10b981"
                      fillOpacity={1}
                      fill="url(#colorLent)"
                      name="Geliehen"
                    />
                  )}
                </AreaChart>
              )}
            </ResponsiveContainer>
          </div>
          <p className="text-xs text-muted-foreground mt-4">
            Zeitraum: {chartDuration === "week" && "1 Woche"}
            {chartDuration === "month" && "1 Monat"}
            {chartDuration === "quarter" && "3 Monate"}
            {chartDuration === "year" && "1 Jahr"} • Kontext:{" "}
            {chartContext === "spending" && "Ausgaben"}
            {chartContext === "lending" && "Geliehen"}
            {chartContext === "both" && "Beides"}
          </p>
        </CardContent>
      </Card>
      </AuroraBackground>
    </div>
  );
}
