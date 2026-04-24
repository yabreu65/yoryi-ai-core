import type { ActionDefinition, ResolvedAssistantContext } from "@yoryi/ai-types";

export type SessionMemorySnapshot = {
  interactionCount: number;
  repeatedQuestion: boolean;
  recentModule?: string;
  preferredActionKeys: string[];
};

type SessionInteraction = {
  normalizedQuestion: string;
  module?: string;
  actionKeys: string[];
  createdAt: number;
};

type SessionState = {
  interactions: SessionInteraction[];
};

export type SessionMemoryInput = {
  context: ResolvedAssistantContext;
  question: string;
  sessionId?: string;
};

export type SessionMemoryPersistInput = {
  context: ResolvedAssistantContext;
  question: string;
  actions: ActionDefinition[];
  sessionId?: string;
};

export class InMemorySessionMemory {
  private readonly sessions = new Map<string, SessionState>();
  private readonly maxInteractionsPerSession = 25;

  getSnapshot(input: SessionMemoryInput): SessionMemorySnapshot {
    const key = this.buildKey(input.context, input.sessionId);
    const state = this.sessions.get(key);

    if (!state || state.interactions.length === 0) {
      return {
        interactionCount: 0,
        repeatedQuestion: false,
        preferredActionKeys: [],
      };
    }

    const normalizedQuestion = this.normalizeQuestion(input.question);
    const repeatedQuestion = state.interactions.some(
      (item) => item.normalizedQuestion === normalizedQuestion
    );

    const recentModule = state.interactions
      .slice()
      .reverse()
      .find((item) => item.module && item.module !== "general")?.module;

    const preferredActionKeys = this.extractPreferredActionKeys(state.interactions);

    return {
      interactionCount: state.interactions.length,
      repeatedQuestion,
      recentModule,
      preferredActionKeys,
    };
  }

  remember(input: SessionMemoryPersistInput): void {
    const key = this.buildKey(input.context, input.sessionId);
    const current = this.sessions.get(key) ?? { interactions: [] };

    current.interactions.push({
      normalizedQuestion: this.normalizeQuestion(input.question),
      module:
        input.context.currentModule && input.context.currentModule !== "general"
          ? input.context.currentModule
          : undefined,
      actionKeys: input.actions.slice(0, 3).map((action) => action.key),
      createdAt: Date.now(),
    });

    if (current.interactions.length > this.maxInteractionsPerSession) {
      current.interactions = current.interactions.slice(
        current.interactions.length - this.maxInteractionsPerSession
      );
    }

    this.sessions.set(key, current);
  }

  private extractPreferredActionKeys(
    interactions: SessionInteraction[]
  ): string[] {
    const counter = new Map<string, number>();

    for (const interaction of interactions.slice(-10)) {
      for (const key of interaction.actionKeys) {
        counter.set(key, (counter.get(key) ?? 0) + 1);
      }
    }

    return [...counter.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([key]) => key);
  }

  private buildKey(context: ResolvedAssistantContext, sessionId?: string): string {
    return [
      context.appId,
      context.tenantId ?? "no-tenant",
      context.userId,
      sessionId ?? "default",
    ].join(":");
  }

  private normalizeQuestion(question: string): string {
    return question.trim().toLowerCase().replace(/\s+/g, " ");
  }
}
