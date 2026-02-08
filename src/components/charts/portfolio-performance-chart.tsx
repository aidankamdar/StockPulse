"use client";

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Area,
  ComposedChart,
} from "recharts";
import { formatCurrency, formatDate } from "@/lib/utils/format";
import { SEMANTIC_COLORS } from "./chart-colors";

import type { PortfolioChartPoint } from "@/types/analytics";

export interface PortfolioPerformanceChartProps {
  data: PortfolioChartPoint[];
}

interface CustomTooltipProps {
  active?: boolean;
  payload?: Array<{
    value: number;
    dataKey: string;
    color: string;
  }>;
  label?: string;
}

function ChartTooltip({ active, payload, label }: CustomTooltipProps) {
  if (!active || !payload?.length) return null;

  const value = payload.find((p) => p.dataKey === "value");
  const costBasis = payload.find((p) => p.dataKey === "costBasis");
  const pnl = payload.find((p) => p.dataKey === "pnl");

  return (
    <div className="rounded-lg border bg-popover p-3 shadow-md">
      <p className="mb-1.5 text-xs text-muted-foreground">
        {label ? formatDate(label) : ""}
      </p>
      {value && (
        <p className="text-sm font-semibold">
          Value: {formatCurrency(value.value)}
        </p>
      )}
      {costBasis && (
        <p className="text-sm text-muted-foreground">
          Cost: {formatCurrency(costBasis.value)}
        </p>
      )}
      {pnl && (
        <p
          className="text-sm font-medium"
          style={{
            color:
              pnl.value >= 0 ? SEMANTIC_COLORS.success : SEMANTIC_COLORS.loss,
          }}
        >
          P&L: {formatCurrency(pnl.value)}
        </p>
      )}
    </div>
  );
}

function formatYAxis(value: number): string {
  if (value >= 1000000) return `$${(value / 1000000).toFixed(1)}M`;
  if (value >= 1000) return `$${(value / 1000).toFixed(1)}K`;
  return `$${value}`;
}

function formatXAxisDate(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export function PortfolioPerformanceChart({
  data,
}: PortfolioPerformanceChartProps) {
  if (data.length === 0) {
    return (
      <div className="flex h-[300px] items-center justify-center text-muted-foreground">
        No snapshot data available yet. Check back after market close.
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={300}>
      <ComposedChart
        data={data}
        margin={{ top: 5, right: 10, left: 10, bottom: 0 }}
      >
        <defs>
          <linearGradient id="valueGradient" x1="0" y1="0" x2="0" y2="1">
            <stop
              offset="5%"
              stopColor={SEMANTIC_COLORS.primary}
              stopOpacity={0.3}
            />
            <stop
              offset="95%"
              stopColor={SEMANTIC_COLORS.primary}
              stopOpacity={0}
            />
          </linearGradient>
        </defs>
        <CartesianGrid
          strokeDasharray="3 3"
          stroke="hsl(var(--border))"
          vertical={false}
        />
        <XAxis
          dataKey="date"
          tickFormatter={formatXAxisDate}
          tick={{ fontSize: 12 }}
          stroke="hsl(var(--muted-foreground))"
          tickLine={false}
          axisLine={false}
        />
        <YAxis
          tickFormatter={formatYAxis}
          tick={{ fontSize: 12 }}
          stroke="hsl(var(--muted-foreground))"
          tickLine={false}
          axisLine={false}
          width={65}
        />
        <Tooltip content={<ChartTooltip />} />
        <Area
          type="monotone"
          dataKey="value"
          fill="url(#valueGradient)"
          stroke="none"
        />
        <Line
          type="monotone"
          dataKey="value"
          stroke={SEMANTIC_COLORS.primary}
          strokeWidth={2}
          dot={false}
          activeDot={{ r: 4, strokeWidth: 0 }}
          name="Portfolio Value"
        />
        <Line
          type="monotone"
          dataKey="costBasis"
          stroke={SEMANTIC_COLORS.muted}
          strokeWidth={1}
          strokeDasharray="5 5"
          dot={false}
          name="Cost Basis"
        />
      </ComposedChart>
    </ResponsiveContainer>
  );
}
