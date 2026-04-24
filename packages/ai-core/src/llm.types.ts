export type LlmMessage = {
  role: "system" | "user" | "assistant";
  content: string;
};

export type LlmRequest = {
  model: string;
  messages: LlmMessage[];
  temperature?: number;
  maxTokens?: number;
};

export type LlmResponse = {
  model: string;
  message: {
    role: "assistant";
    content: string;
  };
  done: boolean;
}

export interface LlmProvider {
  readonly providerName: string;
  
  isAvailable(): Promise<boolean>;
  
  generate(request: LlmRequest): Promise<string>;

  buildPrompt(params: {
    question: string;
    module?: string;
    role: string;
    knowledgeContent: string;
  }): LlmMessage[];
}

export type LlmConfig = {
  baseUrl: string;
  model: string;
  temperature?: number;
  maxTokens?: number;
  systemPrompt?: string;
};

export const DEFAULT_LLM_CONFIG: Required<LlmConfig> = {
  baseUrl: "http://localhost:11434",
  model: "llama3",
  temperature: 0.3,
  maxTokens: 1024,
  systemPrompt: "Sos un asistente de soporte técnico para una aplicación SaaS multi-tenant. Respondé ONLY utilizando el contexto de conocimiento proporcionado. Si no hay información suficiente, decilo claramente. NO inventés datos ni asumas políticas que no estén en el contexto. Mantené las respuestas claras, breves y accionables en español neutral LATAM.",
};