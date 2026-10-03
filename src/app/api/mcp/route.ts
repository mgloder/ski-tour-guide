import { NextRequest, NextResponse } from "next/server";
import { exercises } from "@/data/exercises";
import { equipment } from "@/data/equipment";
import { getPlaces, getPlace } from "@/lib/places";

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
      const item = equipment.find(e => e.id === args.id);
      if (!item) throw { code: -32602, message: `Equipment '${args.id}' not found` };
      return item;
    }
    case "ski_list_places": {
      let places = await getPlaces();

      if (args.country) {
        const c = (args.country as string).toLowerCase();
        places = places.filter(p => p.country?.toLowerCase() === c);
      }
      if (args.difficulty && args.difficulty !== "all") {
        places = places.filter(p => p.difficulty === args.difficulty);
      }
      if (args.tags && Array.isArray(args.tags) && args.tags.length > 0) {
        const tags = args.tags as string[];
        places = places.filter(p => tags.some(t => p.tags.includes(t)));
      }
      if (args.min_km != null) {
        places = places.filter(p => (p.total_km ?? 0) >= (args.min_km as number));
      }
      if (args.max_km != null) {
        places = places.filter(p => (p.total_km ?? 0) <= (args.max_km as number));
      }

      const limit = Math.min(Number(args.limit ?? 50), 200);
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
      const place = await getPlace(args.id as string);
      if (!place) throw { code: -32602, message: `Place '${args.id}' not found` };
      return place;
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
