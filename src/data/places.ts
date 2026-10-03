export type SkiDifficulty = "beginner" | "intermediate" | "advanced" | "all";

export type SkiPlace = {
  id: string;
  name: string;
  country: string;
  region: string;
  description: string;
  altitude: { base: number; peak: number };
  runs: { green: number; blue: number; red: number; black: number };
  totalKm: number;
  difficulty: SkiDifficulty;
  highlights: string[];
  bestMonths: string[];
  website: string;
};

export const places: SkiPlace[] = [
  {
    id: "les-trois-vallees",
    name: "Les Trois Vallées",
    country: "France",
    region: "Savoie, Alps",
    description:
      "The world's largest linked ski area. Three valleys — Courchevel, Méribel, and Les Menuires/Val Thorens — connect into 600km of pistes served by over 170 lifts.",
    altitude: { base: 1100, peak: 3230 },
    runs: { green: 50, blue: 150, red: 130, black: 40 },
    totalKm: 600,
    difficulty: "all",
    highlights: [
      "Skiing into four connected resort villages",
      "Val Thorens — Europe's highest ski resort at 2300m base",
      "La Face de Bellevarde black run — used in the 1992 Olympics",
      "Guaranteed snow from November to May at altitude",
    ],
    bestMonths: ["January", "February", "March"],
    website: "https://www.les3vallees.com",
  },
  {
    id: "zermatt",
    name: "Zermatt",
    country: "Switzerland",
    region: "Valais, Alps",
    description:
      "Car-free village beneath the iconic Matterhorn. Year-round skiing on the Klein Matterhorn glacier at 3883m, connected to Cervinia in Italy.",
    altitude: { base: 1620, peak: 3883 },
    runs: { green: 20, blue: 60, red: 70, black: 25 },
    totalKm: 360,
    difficulty: "intermediate",
    highlights: [
      "Matterhorn backdrop — arguably the most scenic ski resort in the world",
      "International ski area crossing into Italy",
      "Year-round skiing on Plateau Rosa glacier",
      "Helicopter skiing access to off-piste terrain",
    ],
    bestMonths: ["December", "January", "February", "March"],
    website: "https://www.zermatt.ch",
  },
  {
    id: "verbier",
    name: "Verbier",
    country: "Switzerland",
    region: "Valais, Alps",
    description:
      "A freeride mecca in the Quatre Vallées area. World-renowned for off-piste routes from the Mont Fort summit at 3330m, and home to the Verbier Xtreme FWT event.",
    altitude: { base: 1500, peak: 3330 },
    runs: { green: 5, blue: 37, red: 44, black: 14 },
    totalKm: 412,
    difficulty: "advanced",
    highlights: [
      "Tortin and Staircase couloirs for expert skiers",
      "Part of the Freeride World Tour circuit",
      "Bruson backcountry area — tree skiing in bad weather",
      "Vibrant après-ski scene",
    ],
    bestMonths: ["January", "February", "March"],
    website: "https://www.verbier.ch",
  },
  {
    id: "st-anton",
    name: "St. Anton am Arlberg",
    country: "Austria",
    region: "Tirol, Vorarlberg",
    description:
      "Birthplace of alpine skiing and home to some of Europe's best off-piste. Part of the Arlberg ski region — 305km of pistes shared with Lech, Zürs, and Warth-Schröcken.",
    altitude: { base: 1304, peak: 2811 },
    runs: { green: 10, blue: 50, red: 70, black: 25 },
    totalKm: 305,
    difficulty: "advanced",
    highlights: [
      "Valluga — steep and spectacular off-piste descents",
      "One of the snowiest resorts in the Alps",
      "Linked to Lech and Zürs — the full Arlberg region",
      "Historic ski culture and lively traditional village",
    ],
    bestMonths: ["December", "January", "February", "March"],
    website: "https://www.stantonamarlberg.com",
  },
  {
    id: "niseko-united",
    name: "Niseko United",
    country: "Japan",
    region: "Hokkaido",
    description:
      "Japan's premier ski destination. Receives some of the lightest, driest powder on earth — average 15m of snowfall per season. Four interconnected resorts on Mount Annupuri.",
    altitude: { base: 190, peak: 1308 },
    runs: { green: 14, blue: 26, red: 20, black: 10 },
    totalKm: 60,
    difficulty: "all",
    highlights: [
      "Champagne powder — some of the driest snow on the planet",
      "Night skiing at all four resorts",
      "Extensive backcountry gates for off-piste access",
      "Japanese onsen (hot spring) culture after skiing",
    ],
    bestMonths: ["December", "January", "February"],
    website: "https://www.niseko.ne.jp/en",
  },
  {
    id: "les-deux-alpes",
    name: "Les Deux Alpes",
    country: "France",
    region: "Isère, Alps",
    description:
      "Best known for its summer glacier skiing and excellent beginner terrain spread across a wide plateau. The glacier at 3600m stays open until August.",
    altitude: { base: 1300, peak: 3600 },
    runs: { green: 22, blue: 75, red: 47, black: 22 },
    totalKm: 225,
    difficulty: "beginner",
    highlights: [
      "Beginner plateau at 2600m — wide, sunny, low-pressure learning terrain",
      "Summer glacier skiing — one of few resorts open in August",
      "La Grave next door — world-famous off-piste for experts",
      "Gravity Park for freestyle and snowpark",
    ],
    bestMonths: ["January", "February", "March", "July", "August"],
    website: "https://www.les2alpes.com",
  },
];
