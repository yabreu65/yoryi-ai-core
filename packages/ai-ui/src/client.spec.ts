import { beforeEach, describe, expect, it, vi } from "vitest";
import { createAssistantClient } from "./client";

describe("createAssistantClient", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("sends bearer token and payload to chat endpoint", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ answer: "ok" }),
    });
    vi.stubGlobal("fetch", fetchMock);

    const client = createAssistantClient({
      baseUrl: "http://localhost:4001",
      getAuthToken: async () => "token-123",
    });

    await client.chat.send({
      message: "hola",
      sessionId: "s_1",
    });

    expect(fetchMock).toHaveBeenCalledWith(
      "http://localhost:4001/assistant/chat",
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({
          Authorization: "Bearer token-123",
        }),
      })
    );
  });
});
