export type AssistantClientOptions = {
  baseUrl: string;
  getAuthToken?: () => Promise<string | undefined> | string | undefined;
};

export type ChatSendInput = {
  message: string;
  context?: Record<string, unknown>;
  useLlm?: boolean;
  sessionId?: string;
};

export type ExecuteActionInput = {
  actionKey: string;
  context?: Record<string, unknown>;
  confirmed?: boolean;
  params?: Record<string, unknown>;
};

export type TrackEventInput = {
  eventName: string;
  actionKey: string;
  actionLabel: string;
  tenantId: string;
  currentRoute: string;
  currentModule?: string;
  targetPath?: string | null;
  isMapped: boolean;
  sessionId: string;
  messageId: string;
  actionIndex: number;
  totalActions: number;
  timestamp: string;
};

export function createAssistantClient(options: AssistantClientOptions) {
  const send = async <TOutput>(
    path: string,
    payload: Record<string, unknown>
  ): Promise<TOutput> => {
    const token = await resolveToken(options.getAuthToken);
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };

    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }

    const response = await fetch(`${stripTrailingSlash(options.baseUrl)}${path}`, {
      method: "POST",
      headers,
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      throw new Error(`Assistant request failed (${response.status})`);
    }

    return (await response.json()) as TOutput;
  };

  return {
    chat: {
      send: <TOutput = unknown>(input: ChatSendInput) =>
        send<TOutput>("/assistant/chat", input as Record<string, unknown>),
    },
    actions: {
      execute: <TOutput = unknown>(input: ExecuteActionInput) =>
        send<TOutput>(
          "/assistant/actions/execute",
          input as Record<string, unknown>
        ),
    },
    events: {
      track: <TOutput = unknown>(input: TrackEventInput) =>
        send<TOutput>("/api/analytics/events", input as Record<string, unknown>),
    },
  };
}

async function resolveToken(
  provider: AssistantClientOptions["getAuthToken"]
): Promise<string | undefined> {
  if (!provider) {
    return undefined;
  }

  return provider();
}

function stripTrailingSlash(url: string): string {
  return url.endsWith("/") ? url.slice(0, -1) : url;
}
