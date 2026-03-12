import { NextRequest, NextResponse } from "next/server";
import { getQuote, getFundamentals } from "@/lib/robinhood/quotes";

import type { StockDetail } from "@/types/analytics";

// GET /api/stocks/AAPL — Stock detail using free Robinhood endpoints
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ symbol: string }> }
) {
  try {
    const { symbol } = await params;

    if (!symbol || symbol.length > 10) {
      return NextResponse.json(
        {
          error: {
            code: "VALIDATION_ERROR",
            message: "Invalid symbol",
          },
        },
        { status: 400 }
      );
    }

    const upperSymbol = symbol.toUpperCase();

    // Fetch quote and fundamentals in parallel
    const [quote, fundamentals] = await Promise.all([
      getQuote(upperSymbol),
      getFundamentals(upperSymbol).catch(() => null), // Fundamentals may not exist for all symbols
    ]);

    const lastPrice = parseFloat(quote.last_trade_price);
    const previousClose = parseFloat(quote.previous_close);
    const change = lastPrice - previousClose;
    const changePercent =
      previousClose > 0 ? (change / previousClose) * 100 : 0;

    const detail: StockDetail = {
      symbol: quote.symbol,
      lastPrice,
      previousClose,
      change: Math.round(change * 10000) / 10000,
      changePercent: Math.round(changePercent * 10000) / 10000,
      updatedAt: quote.updated_at,

      // Fundamentals
      description: fundamentals?.description ?? null,
      marketCap: fundamentals?.market_cap
        ? parseFloat(fundamentals.market_cap)
        : null,
      peRatio: fundamentals?.pe_ratio
        ? parseFloat(fundamentals.pe_ratio)
        : null,
      dividendYield: fundamentals?.dividend_yield
        ? parseFloat(fundamentals.dividend_yield)
        : null,
      sector: fundamentals?.sector ?? null,
      industry: fundamentals?.industry ?? null,
      ceo: fundamentals?.ceo ?? null,
      numEmployees: fundamentals?.num_employees ?? null,
      high52Week: fundamentals?.high_52_weeks
        ? parseFloat(fundamentals.high_52_weeks)
        : null,
      low52Week: fundamentals?.low_52_weeks
        ? parseFloat(fundamentals.low_52_weeks)
        : null,
      volume: fundamentals?.volume
        ? parseFloat(fundamentals.volume)
        : null,
      averageVolume: fundamentals?.average_volume
        ? parseFloat(fundamentals.average_volume)
        : null,
    };

    return NextResponse.json({ data: detail });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to fetch stock detail";
    console.error("[stocks/detail]", message);

    return NextResponse.json(
      { error: { code: "FETCH_FAILED", message } },
      { status: 500 }
    );
  }
}
