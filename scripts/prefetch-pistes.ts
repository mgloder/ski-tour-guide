/**
 * Pre-fetches piste/lift GeoJSON from Overpass for every resort in the DB
 * and stores it in the piste_cache table.
 *
 * Run: npx tsx scripts/prefetch-pistes.ts
 *
 * Safe to re-run — skips resorts that already have a fresh cache entry
 * (fetched within the last 30 days). Pass --force to refresh everything.
 */

import { neon } from "@neondatabase/serverless";
import * as dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

const sql = neon(process.env.POSTGRES_URL!);
const FORCE = process.argv.includes("--force");
const DELAY_MS = 2000; // be polite to the public Overpass API
const D = 0.3; // ±0.3 degrees bbox (~33km) around resort center

async function fetchPistes(lat: number, lng: number): Promise<object> {
  const bbox = `${lat - D},${lng - D},${lat + D},${lng + D}`;
  const q = `[out:json][timeout:30];(way["piste:type"="downhill"](${bbox});way["aerialway"](${bbox}););out geom;`;
  const url = `https://overpass-api.de/api/interpreter?data=${encodeURIComponent(q)}`;
  const res = await fetch(url, { signal: AbortSignal.timeout(40_000) });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const j = await res.json() as { elements: Array<{ type: string; geometry: { lat: number; lon: number }[]; tags?: Record<string, string> }> };

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

async function main() {
  // Create table if needed
  await sql`
    CREATE TABLE IF NOT EXISTS piste_cache (
      place_id   VARCHAR(100) PRIMARY KEY,
      geojson    JSONB        NOT NULL,
      fetched_at TIMESTAMPTZ  NOT NULL DEFAULT now()
    )
  `;
  console.log("✓ piste_cache table ready");

  // Fetch all resorts with coordinates
  const places = await sql`
    SELECT id, name, latitude, longitude FROM places
    WHERE latitude IS NOT NULL AND longitude IS NOT NULL
    ORDER BY name
  ` as { id: string; name: string; latitude: number; longitude: number }[];
  console.log(`  ${places.length} resorts with coordinates\n`);

  // Get IDs already cached within 30 days (skip unless --force)
  const cached = FORCE ? new Set<string>() : new Set(
    (await sql`
      SELECT place_id FROM piste_cache
      WHERE fetched_at > now() - interval '30 days'
    `).map((r: any) => r.place_id as string)
  );
  const todo = places.filter(p => !cached.has(p.id));
  console.log(`  ${cached.size} already cached, ${todo.length} to fetch\n`);

  let ok = 0, fail = 0;
  for (let i = 0; i < todo.length; i++) {
    const p = todo[i];
    process.stdout.write(`[${i + 1}/${todo.length}] ${p.name} … `);
    try {
      const geojson = await fetchPistes(p.latitude, p.longitude);
      const featureCount = (geojson as any).features.length;
      await sql`
        INSERT INTO piste_cache (place_id, geojson, fetched_at)
        VALUES (${p.id}, ${JSON.stringify(geojson)}, now())
        ON CONFLICT (place_id) DO UPDATE
          SET geojson = EXCLUDED.geojson, fetched_at = now()
      `;
      console.log(`✓ ${featureCount} features`);
      ok++;
    } catch (e: any) {
      console.log(`✗ ${e.message}`);
      fail++;
    }
    if (i < todo.length - 1) await new Promise(r => setTimeout(r, DELAY_MS));
  }

  console.log(`\nDone — ${ok} saved, ${fail} failed.`);
  process.exit(0);
}

main().catch(err => { console.error(err); process.exit(1); });
