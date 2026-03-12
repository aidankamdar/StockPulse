"use client";

import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";
import { formatCurrency, formatPercent } from "@/lib/utils/format";
import { getChartColor } from "./chart-colors";

import type { SectorAllocation } from "@/types/analytics";

export interface SectorAllocationChartProps {
  data: SectorAllocation[];
}

interface CustomTooltipProps {
  active?: boolean;
  payload?: Array<{
    payload: SectorAllocation;
  }>;
}

function ChartTooltip({ active, payload }: CustomTooltipProps) {
  if (!active || !payload?.length) return null;
  const sector = payload[0].payload;

  return (
    <div className="rounded-lg border bg-popover p-3 shadow-md">
      <p className="mb-1 text-sm font-semibold">{sector.sector}</p>
      <p className="text-sm text-muted-foreground">
        {formatCurrency(sector.value)}
      </p>
      <p className="text-sm text-muted-foreground">
        {formatPercent(sector.weight).replace("+", "")} of portfolio
      </p>
      <p className="text-xs text-muted-foreground">
        {sector.positionCount} position{sector.positionCount !== 1 ? "s" : ""}
      </p>
    </div>
  );
}

export function SectorAllocationChart({ data }: SectorAllocationChartProps) {
  if (data.length === 0) {
    return (
      <div className="flex h-[300px] items-center justify-center text-muted-foreground">
        No position data available for sector allocation.
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center gap-4 sm:flex-row">
      <ResponsiveContainer width="100%" height={280} className="max-w-[280px]">
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            innerRadius={60}
            outerRadius={110}
            paddingAngle={2}
            dataKey="value"
            nameKey="sector"
          >
            {data.map((_, index) => (
              <Cell key={index} fill={getChartColor(index)} />
            ))}
          </Pie>
          <Tooltip content={<ChartTooltip />} />
        </PieChart>
      </ResponsiveContainer>

      {/* Legend */}
      <div className="flex flex-col gap-2">
        {data.map((sector, index) => (
          <div key={sector.sector} className="flex items-center gap-2">
            <div
              className="h-3 w-3 shrink-0 rounded-full"
              style={{ backgroundColor: getChartColor(index) }}
            />
            <span className="text-sm">{sector.sector}</span>
            <span className="text-sm text-muted-foreground">
              {formatPercent(sector.weight).replace("+", "")}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
