"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.InMemorySessionMemory = void 0;
class InMemorySessionMemory {
    sessions = new Map();
    maxInteractionsPerSession = 25;
    getSnapshot(input) {
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
        const repeatedQuestion = state.interactions.some((item) => item.normalizedQuestion === normalizedQuestion);
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
    remember(input) {
        const key = this.buildKey(input.context, input.sessionId);
        const current = this.sessions.get(key) ?? { interactions: [] };
        current.interactions.push({
            normalizedQuestion: this.normalizeQuestion(input.question),
            module: input.context.currentModule && input.context.currentModule !== "general"
                ? input.context.currentModule
                : undefined,
            actionKeys: input.actions.slice(0, 3).map((action) => action.key),
            createdAt: Date.now(),
        });
        if (current.interactions.length > this.maxInteractionsPerSession) {
            current.interactions = current.interactions.slice(current.interactions.length - this.maxInteractionsPerSession);
        }
        this.sessions.set(key, current);
    }
    extractPreferredActionKeys(interactions) {
        const counter = new Map();
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
    buildKey(context, sessionId) {
        return [
            context.appId,
            context.tenantId ?? "no-tenant",
            context.userId,
            sessionId ?? "default",
        ].join(":");
    }
    normalizeQuestion(question) {
        return question.trim().toLowerCase().replace(/\s+/g, " ");
    }
}
exports.InMemorySessionMemory = InMemorySessionMemory;
