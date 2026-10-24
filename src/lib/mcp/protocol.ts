/**
 * Lõi MCP (Model Context Protocol) tối giản — JSON-RPC 2.0 qua Streamable HTTP, stateless.
 * Chỉ hỗ trợ capability `tools`; không có session, không có SSE stream.
 * @see https://modelcontextprotocol.io/specification
 */
import { z } from "zod";

export const SUPPORTED_PROTOCOL_VERSIONS = ["2025-11-25", "2025-06-18", "2025-03-26", "2024-11-05"];
export const LATEST_PROTOCOL_VERSION = SUPPORTED_PROTOCOL_VERSIONS[0];

export const JSON_RPC_ERRORS = {
  parseError: -32700,
  invalidRequest: -32600,
  methodNotFound: -32601,
  invalidParams: -32602,
  internalError: -32603,
} as const;

export type McpTool = {
  name: string;
  title: string;
  description: string;
  inputSchema: z.ZodObject;
  run: (args: never) => Promise<unknown>;
};

export type McpServerInfo = {
  name: string;
  title: string;
  version: string;
  instructions?: string;
};

type JsonRpcId = string | number | null;

export type JsonRpcResponse =
  | { jsonrpc: "2.0"; id: JsonRpcId; result: unknown }
  | { jsonrpc: "2.0"; id: JsonRpcId; error: { code: number; message: string; data?: unknown } };

const requestSchema = z.object({
  jsonrpc: z.literal("2.0"),
  id: z.union([z.string(), z.number()]).optional(),
  method: z.string(),
  params: z.record(z.string(), z.unknown()).optional(),
});

export function rpcError(id: JsonRpcId, code: number, message: string): JsonRpcResponse {
  return { jsonrpc: "2.0", id, error: { code, message } };
}

/** JSON Schema `inputSchema` cho tools/list — dạng input (default/optional được giữ). */
export function toolInputJsonSchema(tool: McpTool): Record<string, unknown> {
  const schema: Record<string, unknown> = z.toJSONSchema(tool.inputSchema, { io: "input" });
  delete schema.$schema;
  return schema;
}

function negotiateVersion(requested: unknown): string {
  return typeof requested === "string" && SUPPORTED_PROTOCOL_VERSIONS.includes(requested)
    ? requested
    : LATEST_PROTOCOL_VERSION;
}

async function callTool(tools: McpTool[], params: Record<string, unknown> | undefined) {
  const name = params?.name;
  const tool = tools.find((t) => t.name === name);
  if (!tool) return { unknownTool: true as const };

  const parsed = tool.inputSchema.safeParse(params?.arguments ?? {});
  if (!parsed.success) {
    // Lỗi đầu vào trả trong result (isError) để model đọc được và tự sửa tham số.
    return {
      result: {
        isError: true,
        content: [{ type: "text", text: `Invalid arguments: ${z.prettifyError(parsed.error)}` }],
      },
    };
  }

  try {
    const value = await tool.run(parsed.data as never);
    return {
      result: {
        content: [{ type: "text", text: JSON.stringify(value) }],
        ...(value && typeof value === "object" && !Array.isArray(value)
          ? { structuredContent: value }
          : {}),
      },
    };
  } catch (e) {
    const message = e instanceof Error ? e.message : "Tool failed";
    return { result: { isError: true, content: [{ type: "text", text: message }] } };
  }
}

/** Xử lý một message JSON-RPC. Trả `null` cho notification / response (không cần trả lời). */
export async function handleMcpMessage(
  message: unknown,
  tools: McpTool[],
  server: McpServerInfo,
): Promise<JsonRpcResponse | null> {
  const parsed = requestSchema.safeParse(message);
  if (!parsed.success) {
    const looksLikeResponse =
      message !== null && typeof message === "object" && ("result" in message || "error" in message);
    return looksLikeResponse ? null : rpcError(null, JSON_RPC_ERRORS.invalidRequest, "Invalid request");
  }

  const { id, method, params } = parsed.data;
  if (id === undefined) return null;

  switch (method) {
    case "initialize":
      return {
        jsonrpc: "2.0",
        id,
        result: {
          protocolVersion: negotiateVersion(params?.protocolVersion),
          capabilities: { tools: { listChanged: false } },
          serverInfo: { name: server.name, title: server.title, version: server.version },
          ...(server.instructions ? { instructions: server.instructions } : {}),
        },
      };
    case "ping":
      return { jsonrpc: "2.0", id, result: {} };
    case "tools/list":
      return {
        jsonrpc: "2.0",
        id,
        result: {
          tools: tools.map((t) => ({
            name: t.name,
            title: t.title,
            description: t.description,
            inputSchema: toolInputJsonSchema(t),
            annotations: { readOnlyHint: true, openWorldHint: true },
          })),
        },
      };
    case "tools/call": {
      const outcome = await callTool(tools, params);
      if ("unknownTool" in outcome) {
        return rpcError(id, JSON_RPC_ERRORS.invalidParams, `Unknown tool: ${String(params?.name)}`);
      }
      return { jsonrpc: "2.0", id, result: outcome.result };
    }
    default:
      return rpcError(id, JSON_RPC_ERRORS.methodNotFound, `Method not found: ${method}`);
  }
}
