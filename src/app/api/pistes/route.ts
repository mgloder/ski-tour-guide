import { NextRequest, NextResponse } from "next/server";
import { sql } from "@/lib/db";

const D = 0.3;

async function fetchFromOverpass(lat: number, lng: number, signal: AbortSignal) {
  const bbox = `${lat - D},${lng - D},${lat + D},${lng + D}`;
  const q = `[out:json][timeout:30];(way["piste:type"="downhill"](${bbox});way["aerialway"](${bbox}););out geom;`;
  const res = await fetch(`https://overpass-api.de/api/interpreter?data=${encodeURIComponent(q)}`, { signal });
  if (!res.ok) throw new Error(`Overpass HTTP ${res.status}`);
  const j = await res.json() as {
    elements: Array<{ type: string; geometry: { lat: number; lon: number }[]; tags?: Record<string, string> }>;
  };
  return {
    type: "FeatureCollection",
    features: j.elements
      .filter(el => el.type === "way" && el.geometry?.length > 1)
      .map(el => ({
        type: "Feature",
        geometry: { type: "LineString", coordinates: el.geometry.map(p => [p.lon, p.lat]) },
        properties: {
          kind: el.tags?.["piste:type"] ? "piste" : "lift",
          difficulty: el.tags?.["piste:difficulty"] ?? "unknown",
        },
      })),
  };
}

export async function GET(req: NextRequest) {
  const id = req.nextUrl.searchParams.get("id");
  if (!id) return NextResponse.json({ error: "missing id" }, { status: 400 });

  // 1. Try DB cache (valid for 30 days)
  const cached = await sql`
    SELECT geojson FROM piste_cache
    WHERE place_id = ${id} AND fetched_at > now() - interval '30 days'
    LIMIT 1
  `;
  if (cached.length > 0) {
    return NextResponse.json(cached[0].geojson, {
      headers: { "Cache-Control": "public, max-age=86400, stale-while-revalidate=604800" },
    });
  }

  // 2. Cache miss — look up coordinates and fetch from Overpass
  const place = await sql`SELECT latitude, longitude FROM places WHERE id = ${id} LIMIT 1`;
  if (!place.length || !place[0].latitude) {
    return NextResponse.json({ error: "place not found" }, { status: 404 });
  }
  const { latitude, longitude } = place[0] as { latitude: number; longitude: number };

  try {
    const geojson = await fetchFromOverpass(latitude, longitude, AbortSignal.timeout(35_000));

    // Store in cache (best-effort — don't fail the request if this errors)
    sql`
      INSERT INTO piste_cache (place_id, geojson, fetched_at)
      VALUES (${id}, ${JSON.stringify(geojson)}, now())
      ON CONFLICT (place_id) DO UPDATE
        SET geojson = EXCLUDED.geojson, fetched_at = now()
    `.catch(() => {});

    return NextResponse.json(geojson, {
      headers: { "Cache-Control": "public, max-age=86400, stale-while-revalidate=604800" },
    });
  } catch {
    return NextResponse.json({ error: "trail data unavailable" }, { status: 503 });
  }
}
