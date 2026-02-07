import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { searchSymbols } from "@/lib/api/finnhub";

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { error: { code: "UNAUTHORIZED", message: "Not authenticated" } },
        { status: 401 }
      );
    }

    const query = request.nextUrl.searchParams.get("q");

    if (!query || query.length < 1) {
      return NextResponse.json({ data: [] });
    }

    const results = await searchSymbols(query);
    return NextResponse.json({ data: results });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Search failed";
    return NextResponse.json(
      { error: { code: "SEARCH_FAILED", message } },
      { status: 500 }
    );
  }
}
