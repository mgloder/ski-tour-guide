/**
 * Downloads ski area data from openskidata.org and imports into Neon DB.
 * Run: npx tsx scripts/import-openskidata.ts
 *
 * Thresholds (tweak as needed):
 *   MIN_RUNS    – minimum total downhill run count
 *   MIN_KM      – minimum total piste length in km
 */

import { neon } from "@neondatabase/serverless";
import * as dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

const sql = neon(process.env.POSTGRES_URL!);

const MIN_RUNS = 5;
const MIN_KM   = 1;
const BATCH    = 50; // inserts per batch

// ── Types ─────────────────────────────────────────────────────────────────────

type DiffStat = { count: number; lengthInKm: number; maxElevation?: number; minElevation?: number };
type ByDifficulty = { novice?: DiffStat; easy?: DiffStat; intermediate?: DiffStat; advanced?: DiffStat; expert?: DiffStat; freeride?: DiffStat };
type SourceEntry  = { id: string | number; type: string };
type PlaceEntry   = { iso3166_1Alpha2: string; localized: { en: { region: string | null; country: string; locality: string | null } } };

type SkiArea = {
  properties: {
    id: string;
    name: string | null;
    status: string;
    activities: string[];
    places: PlaceEntry[];
    sources: SourceEntry[];
    websites: string[];
    runConvention: string;
    statistics: {
      maxElevation?: number;
      minElevation?: number;
      runs?: { byActivity?: { downhill?: { byDifficulty?: ByDifficulty; lengthInKm?: number } } };
    };
  };
  geometry: {
    type: "Point" | "Polygon" | "MultiPolygon";
    coordinates: number[] | number[][][] | number[][][][];
  };
};

// ── Helpers ───────────────────────────────────────────────────────────────────

function getCoords(geo: SkiArea["geometry"]): { lat: number; lng: number } | null {
  if (geo.type === "Point") {
    const [lng, lat] = geo.coordinates as number[];
    return { lat, lng };
  }
  if (geo.type === "Polygon") {
    const ring = (geo.coordinates as number[][][])[0];
    const lng  = ring.reduce((s, c) => s + c[0], 0) / ring.length;
    const lat  = ring.reduce((s, c) => s + c[1], 0) / ring.length;
    return { lat, lng };
  }
  if (geo.type === "MultiPolygon") {
    const ring = (geo.coordinates as number[][][][])[0][0];
    const lng  = ring.reduce((s, c) => s + c[0], 0) / ring.length;
    const lat  = ring.reduce((s, c) => s + c[1], 0) / ring.length;
    return { lat, lng };
  }
  return null;
}

function runStats(
  byDiff: ByDifficulty | undefined,
  convention: string,
): { green: number; blue: number; red: number; black: number; totalKm: number; altBase: number | null; altPeak: number | null } {
  if (!byDiff) return { green: 0, blue: 0, red: 0, black: 0, totalKm: 0, altBase: null, altPeak: null };

  const n = (k: keyof ByDifficulty) => byDiff[k]?.count ?? 0;
  const km = (k: keyof ByDifficulty) => byDiff[k]?.lengthInKm ?? 0;

  const green = n("novice") + n("easy");
  const blue  = n("intermediate");
  const isNAM = convention === "north_america";
  const red   = isNAM ? 0 : n("advanced");
  const black = isNAM ? n("advanced") + n("expert") + n("freeride") : n("expert") + n("freeride");

  const totalKm = (Object.keys(byDiff) as (keyof ByDifficulty)[]).reduce((s, k) => s + km(k), 0);

  const elevs = (Object.values(byDiff) as DiffStat[]).flatMap(d => [d.minElevation, d.maxElevation]).filter(Boolean) as number[];
  const altBase = elevs.length ? Math.round(Math.min(...elevs)) : null;
  const altPeak = elevs.length ? Math.round(Math.max(...elevs)) : null;

  return { green, blue, red, black, totalKm: Math.round(totalKm * 10) / 10, altBase, altPeak };
}

function deriveDifficulty(green: number, blue: number, red: number, black: number): string {
  const total = green + blue + red + black;
  if (total === 0) return "intermediate";
  const adv = (red + black) / total;
  const easy = green / total;
  if (easy > 0.5 && adv < 0.15) return "beginner";
  if (adv > 0.45)               return "advanced";
  if (green > 0 && blue > 0 && (red > 0 || black > 0)) return "all";
  return "intermediate";
}

function deriveTags(green: number, blue: number, red: number, black: number): string[] {
  const tags: string[] = ["resort"];
  const total = green + blue + red + black;
  if (total === 0) return tags;
  if (green > 0)                              tags.push("beginner-friendly");
  if (blue > 0 || green > 0)                 tags.push("intermediate");
  if (red > 0 || black > 0)                  tags.push("advanced");
  if (black > 0 && black / total > 0.15)     tags.push("expert");
  if ((red + black) / total > 0.5)           tags.push("freeride");
  return tags;
}

function toId(name: string, countryCode: string): string {
  const slug = name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 80);
  return `${slug}-${countryCode.toLowerCase()}`.slice(0, 100);
}

function skimapUrl(sources: SourceEntry[]): string | null {
  const src = sources?.find(s => s.type === "skimap.org");
  return src ? `https://skimap.org/SkiAreas/view/${src.id}` : null;
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  console.log("⬇  Downloading ski_areas.geojson …");
  const res = await fetch("https://tiles.openskimap.org/geojson/ski_areas.geojson");
  if (!res.ok) throw new Error(`HTTP ${res.status}`);

  const geojson = (await res.json()) as { features: SkiArea[] };
  console.log(`   Total features: ${geojson.features.length}`);

  // Filter to operating downhill ski areas
  const candidates = geojson.features.filter(f => {
    const p = f.properties;
    if (!p.name) return false;
    if (p.status !== "operating") return false;
    if (!p.activities?.includes("downhill")) return false;
    const byDiff = p.statistics?.runs?.byActivity?.downhill?.byDifficulty;
    const totalRuns = byDiff
      ? (Object.values(byDiff) as DiffStat[]).reduce((s, d) => s + (d.count ?? 0), 0)
      : 0;
    const totalKm = p.statistics?.runs?.byActivity?.downhill?.lengthInKm ?? 0;
    return totalRuns >= MIN_RUNS || totalKm >= MIN_KM;
  });

  console.log(`   Quality downhill resorts: ${candidates.length}`);

  // Load existing IDs to skip duplicates
  const existing = await sql`SELECT id FROM places`;
  const existingIds = new Set(existing.map((r: any) => r.id));
  console.log(`   Existing rows in DB: ${existingIds.size}`);

  let inserted = 0;
  let skipped  = 0;
  const batch: any[] = [];

  const flush = async () => {
    if (!batch.length) return;
    for (const p of batch) {
      try {
        await sql`
          INSERT INTO places (
            id, name, country, region, description,
            total_km, altitude_base, altitude_peak, difficulty,
            runs_green, runs_blue, runs_red, runs_black,
            website, latitude, longitude, skimap_url, tags,
            highlights, best_months
          ) VALUES (
            ${p.id}, ${p.name}, ${p.country}, ${p.region}, ${p.description},
            ${p.total_km}, ${p.altitude_base}, ${p.altitude_peak}, ${p.difficulty},
            ${p.runs_green}, ${p.runs_blue}, ${p.runs_red}, ${p.runs_black},
            ${p.website}, ${p.latitude}, ${p.longitude}, ${p.skimap_url}, ${p.tags},
            ${p.highlights}, ${p.best_months}
          )
          ON CONFLICT (id) DO NOTHING
        `;
        inserted++;
      } catch {
        skipped++;
      }
    }
    batch.length = 0;
  };

  for (const feature of candidates) {
    const p    = feature.properties;
    const geo  = getCoords(feature.geometry);
    if (!geo) { skipped++; continue; }

    const place   = p.places?.[0];
    const country = place?.localized?.en?.country ?? p.places?.[0]?.iso3166_1Alpha2 ?? "Unknown";
    const region  = place?.localized?.en?.region ?? null;
    const countryCode = place?.iso3166_1Alpha2 ?? "XX";

    const id = toId(p.name!, countryCode);
    if (existingIds.has(id)) { skipped++; continue; }

    const byDiff = p.statistics?.runs?.byActivity?.downhill?.byDifficulty;
    const { green, blue, red, black, totalKm, altBase, altPeak } = runStats(byDiff, p.runConvention);
    const total = green + blue + red + black;

    const description = [
      `${p.name} is a ski resort in ${region ? `${region}, ${country}` : country}.`,
      total > 0 ? ` ${total} mapped runs` + (totalKm > 0 ? ` across ${totalKm} km of piste.` : ".") : "",
      altBase && altPeak ? ` Elevation: ${altBase}–${altPeak}m.` : "",
    ].join("").trim();

    batch.push({
      id,
      name:         p.name,
      country,
      region,
      description,
      total_km:     totalKm > 0 ? Math.round(totalKm) : null,
      altitude_base:  altBase,
      altitude_peak:  altPeak,
      difficulty:   deriveDifficulty(green, blue, red, black),
      runs_green:   green,
      runs_blue:    blue,
      runs_red:     red,
      runs_black:   black,
      website:      p.websites?.[0] ?? null,
      latitude:     geo.lat,
      longitude:    geo.lng,
      skimap_url:   skimapUrl(p.sources),
      tags:         deriveTags(green, blue, red, black),
      highlights:   [],
      best_months:  [],
    });

    if (batch.length >= BATCH) {
      await flush();
      process.stdout.write(`\r   Inserted: ${inserted}  `);
    }
  }

  await flush();
  console.log(`\n✓ Done — inserted: ${inserted}, skipped/errors: ${skipped}`);
  process.exit(0);
}

main().catch(err => { console.error(err); process.exit(1); });
