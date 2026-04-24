import type { ActionDefinition } from "@yoryi/ai-types";
export interface ContextHint {
    currentModule?: string;
    currentRoute?: string;
    screenTitle?: string;
    role?: string;
}
export declare function isProactiveQuestion(question: string): boolean;
export declare function detectModuleFromQuestion(question: string): string | null;
export declare function prioritizeActionsByContext(actions: ActionDefinition[], hint: ContextHint, question: string): ActionDefinition[];
export declare function getProactiveActions(actions: ActionDefinition[], hint: ContextHint): ActionDefinition[];
export declare function limitActionsByContext(actions: ActionDefinition[], hint: ContextHint, _question: string): ActionDefinition[];
export declare function getContextualFallback(hint: ContextHint, question: string): string | null;
export declare function formatContextualAnswer(baseAnswer: string, hint: ContextHint, question: string, hasActions: boolean): string;
