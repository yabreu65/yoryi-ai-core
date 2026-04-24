export type SemanticSourceType =
  | "module"
  | "faq"
  | "flow"
  | "role"
  | "policy";

export type SemanticRetrievalResult = {
  sourceType: SemanticSourceType;
  fileName: string;
  filePath: string;
  content: string;
  score: number;
  metadata?: Record<string, unknown>;
};

export type SemanticRetrieveInput = {
  appId: string;
  question: string;
  module?: string;
  role?: string;
  topK?: number;
  minScore?: number;
};

export interface SemanticRetriever {
  retrieve(input: SemanticRetrieveInput): Promise<SemanticRetrievalResult[]>;
}
