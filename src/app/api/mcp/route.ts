import { NextRequest, NextResponse } from "next/server";
import { exercises } from "@/data/exercises";
import { equipment } from "@/data/equipment";
import { places } from "@/data/places";

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

function err(
  id: JsonRpcRequest["id"],
  code: number,
  message: string,
  data?: unknown
): JsonRpcResponse {
  return { jsonrpc: "2.0", id, error: { code, message, data } };
}

const TOOLS = [
  {
    name: "ski_list_exercises",
    description:
      "List ski exercises. Optionally filter by difficulty (beginner, intermediate, advanced, expert) or type (technique, fitness, balance, conditioning).",
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
    description: "Get full details of a single ski exercise by its id.",
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
      "List ski resorts and places. Optionally filter by country or difficulty (beginner, intermediate, advanced, all).",
    inputSchema: {
      type: "object",
      properties: {
        country: { type: "string", description: "Country name to filter by" },
        difficulty: {
          type: "string",
          enum: ["beginner", "intermediate", "advanced", "all"],
        },
      },
    },
  },
  {
    name: "ski_get_place",
    description: "Get full details of a single ski place/resort by its id.",
    inputSchema: {
      type: "object",
      required: ["id"],
      properties: {
        id: { type: "string", description: "Place id" },
      },
    },
  },
];

function handleToolCall(
  name: string,
  args: Record<string, unknown>
): unknown {
  switch (name) {
    case "ski_list_exercises": {
      let result = exercises;
      if (args.difficulty)
        result = result.filter((e) => e.difficulty === args.difficulty);
      if (args.type) result = result.filter((e) => e.type === args.type);
      return result.map(({ id, name, description, difficulty, type, duration }) => ({
        id,
        name,
        description,
        difficulty,
        type,
        duration,
      }));
    }
    case "ski_get_exercise": {
      const exercise = exercises.find((e) => e.id === args.id);
      if (!exercise) throw { code: -32602, message: `Exercise '${args.id}' not found` };
      return exercise;
    }
    case "ski_list_equipment": {
      let result = equipment;
      if (args.category)
        result = result.filter((e) => e.category === args.category);
      if (args.skillLevel)
        result = result.filter((e) => e.skillLevel === args.skillLevel);
      return result.map(({ id, name, description, category, skillLevel, priceRange }) => ({
        id,
        name,
        description,
        category,
        skillLevel,
        priceRange,
      }));
    }
    case "ski_get_equipment": {
      const item = equipment.find((e) => e.id === args.id);
      if (!item) throw { code: -32602, message: `Equipment '${args.id}' not found` };
      return item;
    }
    case "ski_list_places": {
      let result = places;
      if (args.country)
        result = result.filter(
          (p) => p.country.toLowerCase() === (args.country as string).toLowerCase()
        );
      if (args.difficulty)
        result = result.filter((p) => p.difficulty === args.difficulty);
      return result.map(
        ({ id, name, country, region, description, altitude, totalKm, difficulty }) => ({
          id,
          name,
          country,
          region,
          description,
          altitude,
          totalKm,
          difficulty,
        })
      );
    }
    case "ski_get_place": {
      const place = places.find((p) => p.id === args.id);
      if (!place) throw { code: -32602, message: `Place '${args.id}' not found` };
      return place;
    }
    default:
      throw { code: -32601, message: `Tool '${name}' not found` };
  }
}

function dispatch(req: JsonRpcRequest): JsonRpcResponse {
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
        const content = handleToolCall(toolName, toolArgs);
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
    ? body.map(dispatch)
    : dispatch(body);

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
    tools: TOOLS.map((t) => ({ name: t.name, description: t.description })),
  });
}
