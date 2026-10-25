import { NextRequest, NextResponse } from "next/server";
import { getPlaces } from "@/lib/places";

// GET /api/places
// Supports optional ?page=N&pageSize=N for paginated responses.
// Without params, returns all places (backwards-compatible with server-side getPlaces()).
export async function GET(req: NextRequest) {
  try {
    const all = await getPlaces();

    const pageParam     = req.nextUrl.searchParams.get("page");
    const pageSizeParam = req.nextUrl.searchParams.get("pageSize");

    // No pagination params → return all (backwards-compatible)
    if (!pageParam && !pageSizeParam) {
      return NextResponse.json(all, {
        headers: { "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300" },
      });
    }

    const page     = Math.max(1, parseInt(pageParam     ?? "1",   10) || 1);
    const pageSize = Math.min(500, Math.max(1, parseInt(pageSizeParam ?? "100", 10) || 100));
    const total    = all.length;
    const start    = (page - 1) * pageSize;
    const places   = all.slice(start, start + pageSize);
    const hasMore  = start + pageSize < total;

    return NextResponse.json(
      { places, total, page, pageSize, hasMore },
      { headers: { "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300" } },
    );
  } catch (e) {
    console.error("[places] GET error:", e);
    return NextResponse.json({ error: "internal error" }, { status: 500 });
  }
}
