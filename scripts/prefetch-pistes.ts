/**
 * Pre-fetches piste/lift GeoJSON for every resort and stores it in piste_cache.
 *
 * Instead of calling Overpass directly (blocked by local proxy), this script
 * calls our own /api/pistes endpoint on Vercel, which fetches Overpass
 * server-side and stores the result in the DB automatically.
 *
 * Run:   npx tsx scripts/prefetch-pistes.ts
 * Force: npx tsx scripts/prefetch-pistes.ts --force
 */

import { neon } from "@neondatabase/serverless";
import * as dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

const sql = neon(process.env.POSTGRES_URL!);
const FORCE = process.argv.includes("--force");
const DELAY_MS = 1500;
const BASE_URL = process.env.PREFETCH_BASE_URL ?? "https://theskihandbook.com";

async function main() {
  // Ensure table exists
  await sql`
    CREATE TABLE IF NOT EXISTS piste_cache (
      place_id   VARCHAR(100) PRIMARY KEY,
      geojson    JSONB        NOT NULL,
      fetched_at TIMESTAMPTZ  NOT NULL DEFAULT now()
    )
  `;
  console.log("✓ piste_cache table ready");

  const places = await sql`
    SELECT id, name FROM places
    WHERE latitude IS NOT NULL AND longitude IS NOT NULL
    ORDER BY total_km DESC NULLS LAST, name ASC
  ` as { id: string; name: string }[];
  console.log(`  ${places.length} resorts with coordinates\n`);

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
      // Call our own Vercel API — it fetches Overpass + stores in DB
      const res = await fetch(`${BASE_URL}/api/pistes?id=${encodeURIComponent(p.id)}`, {
        signal: AbortSignal.timeout(45_000),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const geojson = await res.json() as { features: unknown[] };
      console.log(`✓ ${geojson.features?.length ?? 0} features`);
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
