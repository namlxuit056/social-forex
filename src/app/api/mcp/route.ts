import { NextResponse } from "next/server";
import { clientIp } from "@/lib/client-ip";
import { rateLimit } from "@/lib/rate-limit";
import { JSON_RPC_ERRORS, handleMcpMessage, rpcError } from "@/lib/mcp/protocol";
import { MCP_SERVER_INFO, MCP_TOOLS } from "@/lib/mcp/tools";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Public MCP server (Streamable HTTP, stateless, JSON responses).
 * Chỉ có tool đọc dữ liệu công khai — không đọc cookie / session của user.
 * TODO: tool cá nhân (journal, vị thế MT5) cần cơ chế API token riêng — chưa làm.
 */
const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Accept, Mcp-Protocol-Version, Mcp-Session-Id",
};

function json(body: unknown, status = 200) {
  return NextResponse.json(body, { status, headers: CORS_HEADERS });
}

export async function POST(req: Request) {
  const { ok } = rateLimit(`mcp:${clientIp(req.headers)}`, 60, 60_000);
  if (!ok) {
    return json(rpcError(null, JSON_RPC_ERRORS.internalError, "Rate limit exceeded, retry in a minute"), 429);
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return json(rpcError(null, JSON_RPC_ERRORS.parseError, "Parse error"), 400);
  }

  const messages = Array.isArray(body) ? body.slice(0, 20) : [body];
  const responses = (
    await Promise.all(messages.map((m) => handleMcpMessage(m, MCP_TOOLS, MCP_SERVER_INFO)))
  ).filter((r) => r !== null);

  // Chỉ có notification / response từ client → 202 không body (theo spec).
  if (responses.length === 0) {
    return new NextResponse(null, { status: 202, headers: CORS_HEADERS });
  }
  return json(Array.isArray(body) ? responses : responses[0]);
}

/** Không mở SSE stream server → client. */
export function GET() {
  return new NextResponse(null, { status: 405, headers: { ...CORS_HEADERS, Allow: "POST, OPTIONS" } });
}

export function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS_HEADERS });
}
