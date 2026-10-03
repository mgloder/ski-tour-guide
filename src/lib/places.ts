import { sql } from "./db";

export type DbPlace = {
  id: string;
  name: string;
  country: string;
  region: string;
  description: string;
  total_km: number;
  altitude_base: number;
  altitude_peak: number;
  difficulty: string;
  runs_green: number;
  runs_blue: number;
  runs_red: number;
  runs_black: number;
  highlights: string[];
  best_months: string[];
  website: string;
  latitude: number | null;
  longitude: number | null;
  skimap_url: string | null;
  tags: string[];
};

// Tags → equipment IDs
export const TAG_EQUIPMENT: Record<string, string[]> = {
  backcountry:       ["avalanche-beacon", "avalanche-airbag-pack"],
  "off-piste":       ["avalanche-beacon", "all-mountain-skis"],
  freeride:          ["avalanche-beacon", "all-mountain-skis"],
  "beginner-friendly": ["ski-helmet", "alpine-ski-boots", "ski-poles", "ski-goggles", "ski-base-layer"],
  powder:            ["all-mountain-skis", "ski-goggles"],
  glacier:           ["ski-goggles", "ski-base-layer", "ski-helmet"],
  expert:            ["avalanche-beacon", "all-mountain-skis"],
};

// Tags → exercise IDs
export const TAG_EXERCISES: Record<string, string[]> = {
  "beginner-friendly": ["parallel-turn", "single-leg-balance", "wall-sit"],
  intermediate:      ["parallel-turn", "carving", "wall-sit", "lateral-hops"],
  advanced:          ["carving", "short-radius-turns", "lateral-hops"],
  freeride:          ["carving", "short-radius-turns", "lateral-hops"],
  expert:            ["carving", "short-radius-turns"],
  powder:            ["parallel-turn", "carving"],
};

export function getRecommendedEquipment(tags: string[]): string[] {
  const ids = new Set<string>();
  for (const tag of tags) {
    for (const id of TAG_EQUIPMENT[tag] ?? []) ids.add(id);
  }
  return [...ids];
}

export function getRecommendedExercises(tags: string[]): string[] {
  const ids = new Set<string>();
  for (const tag of tags) {
    for (const id of TAG_EXERCISES[tag] ?? []) ids.add(id);
  }
  return [...ids];
}

export async function getPlaces(): Promise<DbPlace[]> {
  const rows = await sql`
    SELECT * FROM places
    ORDER BY
      COALESCE(total_km, 0) DESC,
      (runs_green + runs_blue + runs_red + runs_black) DESC,
      name ASC
  `;
  return rows as DbPlace[];
}

export async function getPlace(id: string): Promise<DbPlace | null> {
  const rows = await sql`SELECT * FROM places WHERE id = ${id} LIMIT 1`;
  return (rows[0] as DbPlace) ?? null;
}
