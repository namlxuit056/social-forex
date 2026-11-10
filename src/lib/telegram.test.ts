import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

function connReset() {
  return Object.assign(new TypeError("fetch failed"), { cause: { code: "ECONNRESET" } });
}

async function loadTelegram() {
  vi.resetModules();
  vi.stubEnv("TELEGRAM_BOT_TOKEN", "test-token");
  return import("./telegram");
}

describe("sendTelegramChannelPost", () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
  });

  it("retries when the connection is reset, then delivers", async () => {
    const fetchMock = vi
      .fn()
      .mockRejectedValueOnce(connReset())
      .mockRejectedValueOnce(connReset())
      .mockResolvedValueOnce(new Response("{}", { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);
    const { sendTelegramChannelPost } = await loadTelegram();

    const sending = sendTelegramChannelPost({ html: "hi" });
    await vi.runAllTimersAsync();
    await expect(sending).resolves.toBeUndefined();
    expect(fetchMock).toHaveBeenCalledTimes(3);
  });

  it("does not retry a rejected request (bad HTML, wrong chat)", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response('{"ok":false}', { status: 400 }));
    vi.stubGlobal("fetch", fetchMock);
    const { sendTelegramChannelPost } = await loadTelegram();

    await expect(sendTelegramChannelPost({ html: "hi" })).rejects.toThrow("400");
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("gives up after a few attempts when the network stays down", async () => {
    const fetchMock = vi.fn().mockRejectedValue(connReset());
    vi.stubGlobal("fetch", fetchMock);
    const { sendTelegramChannelPost } = await loadTelegram();

    const sending = sendTelegramChannelPost({ html: "hi" });
    const assertion = expect(sending).rejects.toThrow("fetch failed");
    await vi.runAllTimersAsync();
    await assertion;
    expect(fetchMock).toHaveBeenCalledTimes(4);
  });
});
