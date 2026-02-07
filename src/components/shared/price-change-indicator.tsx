import { TrendingUp, TrendingDown, Minus } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { formatCurrency, formatPercent } from "@/lib/utils/format";

interface PriceChangeIndicatorProps {
  value: number;
  percent?: number;
  showIcon?: boolean;
  size?: "sm" | "md" | "lg";
}

export function PriceChangeIndicator({
  value,
  percent,
  showIcon = true,
  size = "md",
}: PriceChangeIndicatorProps) {
  const isPositive = value > 0;
  const isNegative = value < 0;
  const isNeutral = value === 0;

  const textSizes = {
    sm: "text-xs",
    md: "text-sm",
    lg: "text-base",
  };

  const iconSizes = {
    sm: "h-3 w-3",
    md: "h-4 w-4",
    lg: "h-5 w-5",
  };

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 font-medium",
        textSizes[size],
        isPositive && "text-success",
        isNegative && "text-loss",
        isNeutral && "text-muted-foreground"
      )}
    >
      {showIcon && isPositive && <TrendingUp className={iconSizes[size]} />}
      {showIcon && isNegative && <TrendingDown className={iconSizes[size]} />}
      {showIcon && isNeutral && <Minus className={iconSizes[size]} />}
      <span>
        {formatCurrency(value)}
        {percent !== undefined && (
          <span className="ml-1">({formatPercent(percent)})</span>
        )}
      </span>
    </span>
  );
}
