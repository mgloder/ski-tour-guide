import { neon } from "@neondatabase/serverless";
import * as dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

const sql = neon(process.env.POSTGRES_URL!);

async function seed() {
  // Create table
  await sql`
    CREATE TABLE IF NOT EXISTS places (
      id             VARCHAR(100) PRIMARY KEY,
      name           VARCHAR(200) NOT NULL,
      country        VARCHAR(100),
      region         VARCHAR(200),
      description    TEXT,
      total_km       INTEGER,
      altitude_base  INTEGER,
      altitude_peak  INTEGER,
      difficulty     VARCHAR(20),
      runs_green     INTEGER DEFAULT 0,
      runs_blue      INTEGER DEFAULT 0,
      runs_red       INTEGER DEFAULT 0,
      runs_black     INTEGER DEFAULT 0,
      highlights     TEXT[]  DEFAULT '{}',
      best_months    TEXT[]  DEFAULT '{}',
      website        VARCHAR(500),
      latitude       FLOAT,
      longitude      FLOAT,
      skimap_url     VARCHAR(500),
      tags           TEXT[]  DEFAULT '{}'
    )
  `;

  const places = [
    {
      id: "les-trois-vallees",
      name: "Les Trois Vallées",
      country: "France",
      region: "Savoie, Alps",
      description: "The world's largest linked ski area. Three valleys — Courchevel, Méribel, and Les Menuires/Val Thorens — connect into 600km of pistes served by over 170 lifts.",
      total_km: 600,
      altitude_base: 1100,
      altitude_peak: 3230,
      difficulty: "all",
      runs_green: 50, runs_blue: 150, runs_red: 130, runs_black: 40,
      highlights: ["Skiing into four connected resort villages", "Val Thorens — Europe's highest ski resort at 2300m base", "La Face de Bellevarde black run — used in the 1992 Olympics", "Guaranteed snow from November to May at altitude"],
      best_months: ["January", "February", "March"],
      website: "https://www.les3vallees.com",
      latitude: 45.42, longitude: 6.63,
      skimap_url: "https://skimap.org/SkiAreas/view/60",
      tags: ["resort", "all-levels", "beginner-friendly", "intermediate", "advanced", "glacier", "off-piste"],
    },
    {
      id: "zermatt",
      name: "Zermatt",
      country: "Switzerland",
      region: "Valais, Alps",
      description: "Car-free village beneath the iconic Matterhorn. Year-round skiing on the Klein Matterhorn glacier at 3883m, connected to Cervinia in Italy.",
      total_km: 360,
      altitude_base: 1620,
      altitude_peak: 3883,
      difficulty: "intermediate",
      runs_green: 20, runs_blue: 60, runs_red: 70, runs_black: 25,
      highlights: ["Matterhorn backdrop — arguably the most scenic ski resort in the world", "International ski area crossing into Italy", "Year-round skiing on Plateau Rosa glacier", "Helicopter skiing access to off-piste terrain"],
      best_months: ["December", "January", "February", "March"],
      website: "https://www.zermatt.ch",
      latitude: 46.02, longitude: 7.75,
      skimap_url: "https://skimap.org/SkiAreas/view/85",
      tags: ["resort", "intermediate", "glacier", "off-piste", "backcountry", "heliskiing", "powder"],
    },
    {
      id: "verbier",
      name: "Verbier",
      country: "Switzerland",
      region: "Valais, Alps",
      description: "A freeride mecca in the Quatre Vallées area. World-renowned for off-piste routes from the Mont Fort summit at 3330m, and home to the Verbier Xtreme FWT event.",
      total_km: 412,
      altitude_base: 1500,
      altitude_peak: 3330,
      difficulty: "advanced",
      runs_green: 5, runs_blue: 37, runs_red: 44, runs_black: 14,
      highlights: ["Tortin and Staircase couloirs for expert skiers", "Part of the Freeride World Tour circuit", "Bruson backcountry area — tree skiing in bad weather", "Vibrant après-ski scene"],
      best_months: ["January", "February", "March"],
      website: "https://www.verbier.ch",
      latitude: 46.10, longitude: 7.22,
      skimap_url: "https://skimap.org/SkiAreas/view/74",
      tags: ["resort", "advanced", "freeride", "off-piste", "backcountry", "expert"],
    },
    {
      id: "st-anton",
      name: "St. Anton am Arlberg",
      country: "Austria",
      region: "Tirol, Vorarlberg",
      description: "Birthplace of alpine skiing and home to some of Europe's best off-piste. Part of the Arlberg ski region — 305km of pistes shared with Lech, Zürs, and Warth-Schröcken.",
      total_km: 305,
      altitude_base: 1304,
      altitude_peak: 2811,
      difficulty: "advanced",
      runs_green: 10, runs_blue: 50, runs_red: 70, runs_black: 25,
      highlights: ["Valluga — steep and spectacular off-piste descents", "One of the snowiest resorts in the Alps", "Linked to Lech and Zürs — the full Arlberg region", "Historic ski culture and lively traditional village"],
      best_months: ["December", "January", "February", "March"],
      website: "https://www.stantonamarlberg.com",
      latitude: 47.13, longitude: 10.27,
      skimap_url: "https://skimap.org/SkiAreas/view/9",
      tags: ["resort", "advanced", "off-piste", "backcountry", "expert", "freeride", "powder"],
    },
    {
      id: "niseko-united",
      name: "Niseko United",
      country: "Japan",
      region: "Hokkaido",
      description: "Japan's premier ski destination. Receives some of the lightest, driest powder on earth — average 15m of snowfall per season. Four interconnected resorts on Mount Annupuri.",
      total_km: 60,
      altitude_base: 190,
      altitude_peak: 1308,
      difficulty: "all",
      runs_green: 14, runs_blue: 26, runs_red: 20, runs_black: 10,
      highlights: ["Champagne powder — some of the driest snow on the planet", "Night skiing at all four resorts", "Extensive backcountry gates for off-piste access", "Japanese onsen (hot spring) culture after skiing"],
      best_months: ["December", "January", "February"],
      website: "https://www.niseko.ne.jp/en",
      latitude: 42.87, longitude: 140.68,
      skimap_url: "https://skimap.org/SkiAreas/view/1117",
      tags: ["resort", "all-levels", "intermediate", "powder", "backcountry", "off-piste", "night-skiing"],
    },
    {
      id: "les-deux-alpes",
      name: "Les Deux Alpes",
      country: "France",
      region: "Isère, Alps",
      description: "Best known for its summer glacier skiing and excellent beginner terrain spread across a wide plateau. The glacier at 3600m stays open until August.",
      total_km: 225,
      altitude_base: 1300,
      altitude_peak: 3600,
      difficulty: "beginner",
      runs_green: 22, runs_blue: 75, runs_red: 47, runs_black: 22,
      highlights: ["Beginner plateau at 2600m — wide, sunny, low-pressure learning terrain", "Summer glacier skiing — one of few resorts open in August", "La Grave next door — world-famous off-piste for experts", "Gravity Park for freestyle and snowpark"],
      best_months: ["January", "February", "March", "July", "August"],
      website: "https://www.les2alpes.com",
      latitude: 45.00, longitude: 6.12,
      skimap_url: "https://skimap.org/SkiAreas/view/114",
      tags: ["resort", "beginner-friendly", "glacier", "summer-skiing", "freestyle", "intermediate"],
    },
  ];

  for (const p of places) {
    await sql`
      INSERT INTO places (
        id, name, country, region, description,
        total_km, altitude_base, altitude_peak, difficulty,
        runs_green, runs_blue, runs_red, runs_black,
        highlights, best_months, website,
        latitude, longitude, skimap_url, tags
      ) VALUES (
        ${p.id}, ${p.name}, ${p.country}, ${p.region}, ${p.description},
        ${p.total_km}, ${p.altitude_base}, ${p.altitude_peak}, ${p.difficulty},
        ${p.runs_green}, ${p.runs_blue}, ${p.runs_red}, ${p.runs_black},
        ${p.highlights}, ${p.best_months}, ${p.website},
        ${p.latitude}, ${p.longitude}, ${p.skimap_url}, ${p.tags}
      )
      ON CONFLICT (id) DO UPDATE SET
        name = EXCLUDED.name, country = EXCLUDED.country, region = EXCLUDED.region,
        description = EXCLUDED.description, total_km = EXCLUDED.total_km,
        altitude_base = EXCLUDED.altitude_base, altitude_peak = EXCLUDED.altitude_peak,
        difficulty = EXCLUDED.difficulty,
        runs_green = EXCLUDED.runs_green, runs_blue = EXCLUDED.runs_blue,
        runs_red = EXCLUDED.runs_red, runs_black = EXCLUDED.runs_black,
        highlights = EXCLUDED.highlights, best_months = EXCLUDED.best_months,
        website = EXCLUDED.website, latitude = EXCLUDED.latitude,
        longitude = EXCLUDED.longitude, skimap_url = EXCLUDED.skimap_url,
        tags = EXCLUDED.tags
    `;
    console.log(`✓ ${p.name}`);
  }

  console.log("\nDone — database seeded.");
  process.exit(0);
}

seed().catch((err) => { console.error(err); process.exit(1); });
