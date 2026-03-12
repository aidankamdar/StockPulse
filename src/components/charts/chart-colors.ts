/**
 * Chart color palette — designed to work with both light/dark themes.
 * Uses HSL strings that pair well with the app's CSS variable system.
 */

export const CHART_COLORS = [
  "hsl(142, 76%, 36%)",   // primary green
  "hsl(221, 83%, 53%)",   // blue
  "hsl(262, 83%, 58%)",   // purple
  "hsl(24, 95%, 53%)",    // orange
  "hsl(346, 77%, 50%)",   // rose
  "hsl(173, 80%, 36%)",   // teal
  "hsl(43, 96%, 56%)",    // amber
  "hsl(292, 84%, 61%)",   // fuchsia
  "hsl(199, 89%, 48%)",   // sky
  "hsl(15, 75%, 51%)",    // rust
] as const;

/**
 * Get a chart color by index. Cycles through the palette.
 */
export function getChartColor(index: number): string {
  return CHART_COLORS[index % CHART_COLORS.length];
}

/**
 * CSS variable references for semantic colors.
 */
export const SEMANTIC_COLORS = {
  success: "hsl(var(--success))",
  loss: "hsl(var(--loss))",
  primary: "hsl(var(--primary))",
  muted: "hsl(var(--muted-foreground))",
} as const;
