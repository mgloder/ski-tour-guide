import { NextRequest, NextResponse } from "next/server";
import { sql } from "@/lib/db";

export const maxDuration = 60;

const D = 0.18; // ±0.18° bbox — ~400KB for most resorts, fast enough within 60s

// Rotate through public Overpass instances — if one is rate-limited, the next handles it
const OVERPASS_ENDPOINTS = [
  "https://overpass-api.de/api/interpreter",
  "https://lz4.overpass-api.de/api/interpreter",
  "https://overpass.kumi.systems/api/interpreter",
];

async function fetchFromOverpass(lat: number, lng: number, signal: AbortSignal) {
  const bbox = `${lat - D},${lng - D},${lat + D},${lng + D}`;
  const q = `[out:json][timeout:25];(way["piste:type"="downhill"](${bbox});way["aerialway"](${bbox}););out geom;`;
  const params = `?data=${encodeURIComponent(q)}`;
  const headers = { "User-Agent": "ski-tour-guide/1.0 (admin@theskihandbook.com)" };

  let lastErr: unknown;
  for (const base of OVERPASS_ENDPOINTS) {
    try {
      const res = await fetch(`${base}${params}`, { signal, headers });
      if (!res.ok) {
        lastErr = new Error(`Overpass HTTP ${res.status} from ${base}`);
        if (res.status === 429 || res.status >= 500) continue; // try next endpoint
        throw lastErr;
      }
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
    } catch (e) {
      if ((e as any)?.name === "AbortError") throw e; // don't retry on timeout
      lastErr = e;
    }
  }
  throw lastErr ?? new Error("all Overpass endpoints failed");
}

export async function GET(req: NextRequest) {
  const id = req.nextUrl.searchParams.get("id");
  if (!id) return NextResponse.json({ error: "missing id" }, { status: 400 });

  // 1. DB cache (30-day TTL)
  try {
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
  } catch {
    // piste_cache table may not exist yet — fall through
  }

  // 2. Look up coordinates
  const place = await sql`SELECT latitude, longitude FROM places WHERE id = ${id} LIMIT 1`;
  if (!place.length || !place[0].latitude) {
    return NextResponse.json({ error: "place not found" }, { status: 404 });
  }
  const { latitude, longitude } = place[0] as { latitude: number; longitude: number };

  // 3. Fetch from Overpass (tries all endpoints)
  try {
    const geojson = await fetchFromOverpass(latitude, longitude, AbortSignal.timeout(50_000));

    // Store in cache async — don't block the response
    sql`
      CREATE TABLE IF NOT EXISTS piste_cache (
        place_id   VARCHAR(100) PRIMARY KEY,
        geojson    JSONB        NOT NULL,
        fetched_at TIMESTAMPTZ  NOT NULL DEFAULT now()
      )
    `.then(() => sql`
      INSERT INTO piste_cache (place_id, geojson, fetched_at)
      VALUES (${id}, ${JSON.stringify(geojson)}, now())
      ON CONFLICT (place_id) DO UPDATE
        SET geojson = EXCLUDED.geojson, fetched_at = now()
    `).catch(() => {});

    return NextResponse.json(geojson, {
      headers: { "Cache-Control": "public, max-age=86400, stale-while-revalidate=604800" },
    });
  } catch (e) {
    console.error(`[pistes] ${id} failed:`, e);
    return NextResponse.json({ error: "trail data unavailable" }, { status: 503 });
  }
}
