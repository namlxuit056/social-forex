import { createHash, randomBytes } from "crypto";

export const MT5_BRIDGE_TOKEN_PREFIX = "sfmt5_";

export function createMt5BridgeToken() {
  return `${MT5_BRIDGE_TOKEN_PREFIX}${randomBytes(32).toString("base64url")}`;
}

export function hashMt5BridgeToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

export function maskMt5BridgeToken(token: string) {
  return token.slice(-4);
}
