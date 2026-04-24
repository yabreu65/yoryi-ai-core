type SessionEntry = {
  role: "user" | "assistant";
  content: string;
  timestamp: number;
};

export type AssistantSessionState = {
  sessionId: string;
  history: SessionEntry[];
  loading: boolean;
  error?: string;
};

export type SessionStore = {
  getState: () => AssistantSessionState;
  pushUserMessage: (content: string) => void;
  pushAssistantMessage: (content: string) => void;
  setLoading: (loading: boolean) => void;
  setError: (error?: string) => void;
  reset: () => void;
};

export function createAssistantSessionStore(sessionId: string): SessionStore {
  const initialState: AssistantSessionState = {
    sessionId,
    history: [],
    loading: false,
  };
  let state: AssistantSessionState = initialState;

  return {
    getState: () => state,
    pushUserMessage: (content) => {
      state = {
        ...state,
        history: [
          ...state.history,
          { role: "user", content, timestamp: Date.now() },
        ].slice(-50),
      };
    },
    pushAssistantMessage: (content) => {
      state = {
        ...state,
        history: [
          ...state.history,
          { role: "assistant", content, timestamp: Date.now() },
        ].slice(-50),
      };
    },
    setLoading: (loading) => {
      state = {
        ...state,
        loading,
      };
    },
    setError: (error) => {
      state = {
        ...state,
        error,
      };
    },
    reset: () => {
      state = {
        ...initialState,
      };
    },
  };
}
