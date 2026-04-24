import { describe, expect, it } from "vitest";
import { createAssistantSessionStore } from "./session-store";

describe("createAssistantSessionStore", () => {
  it("stores lightweight history and loading state", () => {
    const store = createAssistantSessionStore("session-1");

    store.pushUserMessage("hola");
    store.pushAssistantMessage("¿cómo estás?");
    store.setLoading(true);

    const state = store.getState();
    expect(state.sessionId).toBe("session-1");
    expect(state.history).toHaveLength(2);
    expect(state.loading).toBe(true);
  });
});
