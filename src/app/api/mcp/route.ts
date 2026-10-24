import { NextRequest, NextResponse } from "next/server";
import { exercises } from "@/data/exercises";
import { equipment } from "@/data/equipment";
import { getPlaces, getPlace } from "@/lib/places";
import { sql } from "@/lib/db";

// ── Weather helpers (shared with ski_get_weather tool) ────────────────────

const WEATHER_DESCRIPTIONS: Record<string, string> = {
  "0": "Clear", "1": "Partly cloudy", "2": "Partly cloudy", "3": "Partly cloudy",
  "45": "Fog", "48": "Fog",
  "51": "Rain", "53": "Rain", "55": "Rain", "56": "Rain", "57": "Rain",
  "61": "Rain", "63": "Rain", "65": "Rain", "66": "Rain", "67": "Rain",
  "71": "Snow", "73": "Snow", "75": "Snow", "77": "Snow",
  "80": "Showers", "81": "Showers", "82": "Showers",
  "85": "Snow showers", "86": "Snow showers",
  "95": "Thunderstorm", "96": "Thunderstorm", "99": "Thunderstorm",
};

function describeWeatherCode(code: number): string {
  const exact = WEATHER_DESCRIPTIONS[String(code)];
  if (exact) return exact;
  if (code >= 1 && code <= 3) return "Partly cloudy";
  if (code >= 45 && code <= 48) return "Fog";
  if (code >= 51 && code <= 67) return "Rain";
  if (code >= 71 && code <= 77) return "Snow";
  if (code >= 80 && code <= 82) return "Showers";
  if (code >= 85 && code <= 86) return "Snow showers";
  if (code >= 95 && code <= 99) return "Thunderstorm";
  return "Unknown";
}

async function fetchWeather(lat: number, lng: number) {
  const url =
    `https://api.open-meteo.com/v1/forecast` +
    `?latitude=${lat}&longitude=${lng}` +
    `&current=temperature_2m,wind_speed_10m,snowfall,weather_code` +
    `&wind_speed_unit=kmh`;
  const res = await fetch(url, { next: { revalidate: 1800 } });
  if (!res.ok) throw { code: -32603, message: `Open-Meteo returned ${res.status}` };
  const data = await res.json() as {
    current: {
      temperature_2m: number;
      wind_speed_10m: number;
      snowfall: number;
      weather_code: number;
    };
  };
  const { temperature_2m, wind_speed_10m, snowfall, weather_code } = data.current;
  return { temperature_2m, wind_speed_10m, snowfall, weather_code, description: describeWeatherCode(weather_code) };
}

// MCP JSON-RPC 2.0 server for ski-tour-guide
// Protocol: https://spec.modelcontextprotocol.io

type JsonRpcRequest = {
  jsonrpc: "2.0";
  id: string | number | null;
  method: string;
  params?: Record<string, unknown>;
};

type JsonRpcResponse = {
  jsonrpc: "2.0";
  id: string | number | null;
  result?: unknown;
  error?: { code: number; message: string; data?: unknown };
};

function ok(id: JsonRpcRequest["id"], result: unknown): JsonRpcResponse {
  return { jsonrpc: "2.0", id, result };
}

function err(id: JsonRpcRequest["id"], code: number, message: string, data?: unknown): JsonRpcResponse {
  return { jsonrpc: "2.0", id, error: { code, message, data } };
}

const TOOLS = [
  {
    name: "ski_list_exercises",
    description:
      "List ski training exercises. Optionally filter by difficulty (beginner, intermediate, advanced, expert) or type (technique, fitness, balance, conditioning).",
    inputSchema: {
      type: "object",
      properties: {
        difficulty: {
          type: "string",
          enum: ["beginner", "intermediate", "advanced", "expert"],
          description: "Filter by difficulty level",
        },
        type: {
          type: "string",
          enum: ["technique", "fitness", "balance", "conditioning"],
          description: "Filter by exercise type",
        },
      },
    },
  },
  {
    name: "ski_get_exercise",
    description: "Get full details of a single ski training exercise by its id.",
    inputSchema: {
      type: "object",
      required: ["id"],
      properties: {
        id: { type: "string", description: "Exercise id" },
      },
    },
  },
  {
    name: "ski_list_equipment",
    description:
      "List ski equipment items. Optionally filter by category (skis, boots, poles, helmet, clothing, safety, accessories) or skillLevel (beginner, intermediate, advanced, all).",
    inputSchema: {
      type: "object",
      properties: {
        category: {
          type: "string",
          enum: ["skis", "boots", "poles", "helmet", "clothing", "safety", "accessories"],
        },
        skillLevel: {
          type: "string",
          enum: ["beginner", "intermediate", "advanced", "all"],
        },
      },
    },
  },
  {
    name: "ski_get_equipment",
    description: "Get full details of a single equipment item by its id.",
    inputSchema: {
      type: "object",
      required: ["id"],
      properties: {
        id: { type: "string", description: "Equipment item id" },
      },
    },
  },
  {
    name: "ski_list_places",
    description:
      "List ski resorts from a database of 2,600+ worldwide destinations. Results are sorted by size (largest first) by default. Use filters to narrow down. Returns up to `limit` results (default 50, max 200).",
    inputSchema: {
      type: "object",
      properties: {
        country: {
          type: "string",
          description: "Filter by country name (e.g. 'France', 'Austria', 'Switzerland')",
        },
        difficulty: {
          type: "string",
          enum: ["beginner", "intermediate", "advanced", "all"],
          description: "Filter by overall resort difficulty",
        },
        tags: {
          type: "array",
          items: { type: "string" },
          description: "Filter by tags, e.g. ['powder', 'glacier', 'backcountry', 'beginner-friendly', 'expert', 'summer-skiing']. Any match returns the resort.",
        },
        min_km: {
          type: "number",
          description: "Minimum total piste length in km",
        },
        max_km: {
          type: "number",
          description: "Maximum total piste length in km",
        },
        limit: {
          type: "number",
          description: "Max results to return (default 50, max 200)",
        },
      },
    },
  },
  {
    name: "ski_get_place",
    description: "Get full details of a single ski resort by its id (e.g. 'zermatt-ch', 'les-trois-vallees-fr').",
    inputSchema: {
      type: "object",
      required: ["id"],
      properties: {
        id: { type: "string", description: "Resort id" },
      },
    },
  },
  {
    name: "ski_compare_resorts",
    description: "Compare up to 5 ski resorts side-by-side. Returns key stats for each resort including runs, lifts, vertical drop, and facilities.",
    inputSchema: {
      type: "object",
      required: ["ids"],
      properties: {
        ids: {
          type: "array",
          items: { type: "string" },
          description: "Array of resort IDs to compare (max 5)",
          maxItems: 5,
        },
      },
    },
  },
  {
    name: "ski_get_weather",
    description: "Get current weather for a ski resort by its ID. Returns temperature, wind speed, snowfall, and a human-readable description.",
    inputSchema: {
      type: "object",
      required: ["id"],
      properties: {
        id: { type: "string", description: "Resort id" },
      },
    },
  },
  {
    name: "ski_random_place",
    description: "Get a random ski resort. Optionally filter by tags to get a random resort matching specific criteria.",
    inputSchema: {
      type: "object",
      properties: {
        tags: {
          type: "array",
          items: { type: "string" },
          description: "Optional tags to filter by (e.g. ['powder', 'beginner-friendly']). Returns a random match.",
        },
      },
    },
  },
];

async function handleToolCall(name: string, args: Record<string, unknown>): Promise<unknown> {
  switch (name) {
    case "ski_list_exercises": {
      let result = exercises;
      if (args.difficulty) result = result.filter(e => e.difficulty === args.difficulty);
      if (args.type)       result = result.filter(e => e.type === args.type);
      return result.map(({ id, name, description, difficulty, type, duration }) => ({
        id, name, description, difficulty, type, duration,
      }));
    }
    case "ski_get_exercise": {
      if (typeof args.id !== "string") throw { code: -32602, message: "id must be a string" };
      const exercise = exercises.find(e => e.id === args.id);
      if (!exercise) throw { code: -32602, message: `Exercise '${args.id}' not found` };
      return exercise;
    }
    case "ski_list_equipment": {
      let result = equipment;
      if (args.category)   result = result.filter(e => e.category === args.category);
      if (args.skillLevel) result = result.filter(e => e.skillLevel === args.skillLevel);
      return result.map(({ id, name, description, category, skillLevel, priceRange }) => ({
        id, name, description, category, skillLevel, priceRange,
      }));
    }
    case "ski_get_equipment": {
      if (typeof args.id !== "string") throw { code: -32602, message: "id must be a string" };
      const item = equipment.find(e => e.id === args.id);
      if (!item) throw { code: -32602, message: `Equipment '${args.id}' not found` };
      return item;
    }
    case "ski_list_places": {
      let places = await getPlaces();

      if (typeof args.country === "string" && args.country) {
        const c = args.country.toLowerCase();
        places = places.filter(p => p.country?.toLowerCase() === c);
      }
      if (typeof args.difficulty === "string" && args.difficulty && args.difficulty !== "all") {
        places = places.filter(p => p.difficulty === args.difficulty);
      }
      if (Array.isArray(args.tags) && args.tags.length > 0) {
        const tags = args.tags.filter((t): t is string => typeof t === "string");
        places = places.filter(p => tags.some(t => p.tags.includes(t)));
      }
      if (typeof args.min_km === "number") {
        const minKm = args.min_km;
        places = places.filter(p => (p.total_km ?? 0) >= minKm);
      }
      if (typeof args.max_km === "number") {
        const maxKm = args.max_km;
        places = places.filter(p => (p.total_km ?? 0) <= maxKm);
      }

      const rawLimit = typeof args.limit === "number" ? args.limit : 50;
      const limit = Math.min(rawLimit, 200);
      return places.slice(0, limit).map(({
        id, name, country, region, description,
        total_km, altitude_base, altitude_peak,
        difficulty, tags, website, skimap_url,
      }) => ({
        id, name, country, region, description,
        total_km, altitude_base, altitude_peak,
        difficulty, tags, website, skimap_url,
      }));
    }
    case "ski_get_place": {
      if (typeof args.id !== "string") throw { code: -32602, message: "id must be a string" };
      const place = await getPlace(args.id);
      if (!place) throw { code: -32602, message: `Place '${args.id}' not found` };
      return place;
    }
    case "ski_compare_resorts": {
      if (!Array.isArray(args.ids) || args.ids.length === 0) {
        throw { code: -32602, message: "ids must be a non-empty array" };
      }
      const ids = (args.ids as unknown[])
        .filter((id): id is string => typeof id === "string")
        .slice(0, 5);
      const results = await Promise.all(ids.map(id => getPlace(id)));
      return results.map((p, i) => {
        if (!p) return { id: ids[i], error: "Not found" };
        return {
          id: p.id,
          name: p.name,
          country: p.country,
          total_km: p.total_km,
          vertical_drop: p.vertical_drop,
          lifts_count: p.lifts_count,
          runs_green: p.runs_green,
          runs_blue: p.runs_blue,
          runs_red: p.runs_red,
          runs_black: p.runs_black,
          altitude_peak: p.altitude_peak,
          has_night_skiing: p.has_night_skiing,
          has_snow_park: p.has_snow_park,
        };
      });
    }
    case "ski_get_weather": {
      if (typeof args.id !== "string") throw { code: -32602, message: "id must be a string" };
      const place = await getPlace(args.id);
      if (!place) throw { code: -32602, message: `Place '${args.id}' not found` };
      if (place.latitude == null || place.longitude == null) {
        throw { code: -32602, message: `Place '${args.id}' has no coordinates` };
      }
      const weather = await fetchWeather(place.latitude, place.longitude);
      return { resort: { id: place.id, name: place.name }, weather };
    }
    case "ski_random_place": {
      let rows;
      if (Array.isArray(args.tags) && args.tags.length > 0) {
        const tags = (args.tags as unknown[]).filter((t): t is string => typeof t === "string");
        rows = await sql`
          SELECT * FROM places
          WHERE tags && ${tags}::text[]
          ORDER BY RANDOM()
          LIMIT 1
        `;
      } else {
        rows = await sql`
          SELECT * FROM places
          ORDER BY RANDOM()
          LIMIT 1
        `;
      }
      if (!rows || rows.length === 0) throw { code: -32602, message: "No places found" };
      return rows[0];
    }
    default:
      throw { code: -32601, message: `Tool '${name}' not found` };
  }
}

async function dispatch(req: JsonRpcRequest): Promise<JsonRpcResponse> {
  const { id, method, params = {} } = req;
  try {
    switch (method) {
      case "initialize":
        return ok(id, {
          protocolVersion: "2024-11-05",
          serverInfo: { name: "ski-tour-guide", version: "1.0.0" },
          capabilities: { tools: {} },
        });
      case "tools/list":
        return ok(id, { tools: TOOLS });
      case "tools/call": {
        const toolName = params.name as string;
        const toolArgs = (params.arguments ?? {}) as Record<string, unknown>;
        const content = await handleToolCall(toolName, toolArgs);
        return ok(id, {
          content: [{ type: "text", text: JSON.stringify(content, null, 2) }],
        });
      }
      case "ping":
        return ok(id, {});
      default:
        return err(id, -32601, `Method '${method}' not found`);
    }
  } catch (e: unknown) {
    const mcpErr = e as { code?: number; message?: string };
    return err(id, mcpErr.code ?? -32603, mcpErr.message ?? "Internal error", e);
  }
}

export async function POST(req: NextRequest) {
  const body = (await req.json()) as JsonRpcRequest | JsonRpcRequest[];
  const response = Array.isArray(body)
    ? await Promise.all(body.map(dispatch))
    : await dispatch(body);
  return NextResponse.json(response, {
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    },
  });
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    },
  });
}

export async function GET() {
  return NextResponse.json({
    name: "ski-tour-guide MCP server",
    version: "1.0.0",
    protocol: "MCP JSON-RPC 2.0",
    endpoint: "/api/mcp",
    tools: TOOLS.map(t => ({ name: t.name, description: t.description })),
  });
}
