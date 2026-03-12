import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getHistoricals } from "@/lib/robinhood/quotes";

const SpanSchema = z.enum(["week", "month", "3month", "year", "5year"]);
const IntervalSchema = z.enum(["5minute", "10minute", "day", "week", "month"]);

// GET /api/stocks/AAPL/historicals?span=month&interval=day
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ symbol: string }> }
) {
  try {
    const { symbol } = await params;

    if (!symbol || symbol.length > 10) {
      return NextResponse.json(
        { error: { code: "VALIDATION_ERROR", message: "Invalid symbol" } },
        { status: 400 }
      );
    }

    const { searchParams } = new URL(request.url);
    const spanParam = searchParams.get("span") ?? "month";
    const intervalParam = searchParams.get("interval") ?? "day";

    const spanResult = SpanSchema.safeParse(spanParam);
    const intervalResult = IntervalSchema.safeParse(intervalParam);

    if (!spanResult.success || !intervalResult.success) {
      return NextResponse.json(
        {
          error: {
            code: "VALIDATION_ERROR",
            message: "Invalid span or interval parameter",
          },
        },
        { status: 400 }
      );
    }

    const historicals = await getHistoricals(
      symbol.toUpperCase(),
      intervalResult.data,
      spanResult.data
    );

    const points = historicals.historicals.map((h) => ({
      date: h.begins_at,
      open: parseFloat(h.open_price),
      close: parseFloat(h.close_price),
      high: parseFloat(h.high_price),
      low: parseFloat(h.low_price),
      volume: h.volume,
    }));

    return NextResponse.json({
      data: {
        symbol: historicals.symbol,
        span: historicals.span,
        interval: historicals.interval,
        points,
      },
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to fetch historicals";
    console.error("[stocks/historicals]", message);

    return NextResponse.json(
      { error: { code: "FETCH_FAILED", message } },
      { status: 500 }
    );
  }
}
