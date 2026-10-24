import { describe, expect, it } from "vitest";
import { z } from "zod";
import { JSON_RPC_ERRORS, LATEST_PROTOCOL_VERSION, handleMcpMessage, type McpTool } from "./protocol";

const echo: McpTool = {
  name: "echo",
  title: "Echo",
  description: "Echo back",
  inputSchema: z.object({ text: z.string(), times: z.number().default(1) }),
  run: (async ({ text, times }: { text: string; times: number }) => ({ text: text.repeat(times) })) as never,
};

const boom: McpTool = {
  name: "boom",
  title: "Boom",
  description: "Always throws",
  inputSchema: z.object({}),
  run: async () => {
    throw new Error("upstream down");
  },
};

const server = { name: "test", title: "Test", version: "1.0.0" };
const call = (message: unknown) => handleMcpMessage(message, [echo, boom], server);

describe("handleMcpMessage", () => {
  it("initialize echoes a supported protocol version", async () => {
    const res = await call({ jsonrpc: "2.0", id: 1, method: "initialize", params: { protocolVersion: "2025-06-18" } });
    expect(res).toMatchObject({
      id: 1,
      result: { protocolVersion: "2025-06-18", capabilities: { tools: {} }, serverInfo: { name: "test" } },
    });
  });

  it("initialize falls back to the latest version for unknown versions", async () => {
    const res = await call({ jsonrpc: "2.0", id: 1, method: "initialize", params: { protocolVersion: "1999-01-01" } });
    expect(res).toMatchObject({ result: { protocolVersion: LATEST_PROTOCOL_VERSION } });
  });

  it("returns null for notifications and client responses", async () => {
    expect(await call({ jsonrpc: "2.0", method: "notifications/initialized" })).toBeNull();
    expect(await call({ jsonrpc: "2.0", id: 9, result: {} })).toBeNull();
  });

  it("tools/list exposes JSON Schema without $schema", async () => {
    const res = await call({ jsonrpc: "2.0", id: 2, method: "tools/list" });
    const tools = (res as { result: { tools: { name: string; inputSchema: Record<string, unknown> }[] } }).result.tools;
    expect(tools.map((t) => t.name)).toEqual(["echo", "boom"]);
    expect(tools[0].inputSchema).toMatchObject({ type: "object", properties: { text: { type: "string" } } });
    expect(tools[0].inputSchema).not.toHaveProperty("$schema");
  });

  it("tools/call applies defaults and returns text + structured content", async () => {
    const res = await call({ jsonrpc: "2.0", id: 3, method: "tools/call", params: { name: "echo", arguments: { text: "hi" } } });
    expect(res).toMatchObject({
      result: { content: [{ type: "text", text: '{"text":"hi"}' }], structuredContent: { text: "hi" } },
    });
  });

  it("tools/call reports invalid arguments as a tool error", async () => {
    const res = await call({ jsonrpc: "2.0", id: 4, method: "tools/call", params: { name: "echo", arguments: { text: 1 } } });
    expect(res).toMatchObject({ result: { isError: true } });
  });

  it("tools/call reports thrown errors as a tool error", async () => {
    const res = await call({ jsonrpc: "2.0", id: 5, method: "tools/call", params: { name: "boom" } });
    expect(res).toMatchObject({ result: { isError: true, content: [{ text: "upstream down" }] } });
  });

  it("unknown tool and unknown method are JSON-RPC errors", async () => {
    expect(await call({ jsonrpc: "2.0", id: 6, method: "tools/call", params: { name: "nope" } })).toMatchObject({
      error: { code: JSON_RPC_ERRORS.invalidParams },
    });
    expect(await call({ jsonrpc: "2.0", id: 7, method: "resources/list" })).toMatchObject({
      error: { code: JSON_RPC_ERRORS.methodNotFound },
    });
  });

  it("rejects malformed requests", async () => {
    expect(await call({ id: 8, method: "ping" })).toMatchObject({ error: { code: JSON_RPC_ERRORS.invalidRequest } });
  });
});
