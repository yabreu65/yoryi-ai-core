"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.OllamaLlmProvider = void 0;
const llm_types_1 = require("./llm.types");
class OllamaLlmProvider {
    providerName = "ollama";
    model;
    config;
    constructor(config = {}) {
        this.config = {
            ...llm_types_1.DEFAULT_LLM_CONFIG,
            ...config,
        };
        this.model = this.config.model;
    }
    async isAvailable() {
        try {
            const response = await fetch(`${this.config.baseUrl}/api/tags`, {
                method: "GET",
            });
            return response.ok;
        }
        catch {
            return false;
        }
    }
    async generate(request) {
        const url = `${this.config.baseUrl}/api/chat`;
        const model = request.model ?? this.config.model;
        const payload = {
            model,
            messages: request.messages,
            temperature: request.temperature ?? this.config.temperature,
            max_tokens: request.maxTokens ?? this.config.maxTokens,
            stream: false,
        };
        const response = await fetch(url, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify(payload),
        });
        if (!response.ok) {
            throw new Error(`Ollama request failed: ${response.status} ${response.statusText}`);
        }
        const data = await response.json();
        return data.message.content;
    }
    buildPrompt(params) {
        const systemContent = this.config.systemPrompt
            ? `${this.config.systemPrompt}\n\n📌 Módulo actual: ${params.module ?? "general"}\n👤 Rol del usuario: ${params.role}`
            : `Sos un asistente de soporte técnico. Respondé usando SOLO el contexto de conocimiento proporcionado.\n\n📌 Módulo actual: ${params.module ?? "general"}\n👤 Rol del usuario: ${params.role}`;
        return [
            { role: "system", content: systemContent },
            {
                role: "user",
                content: this.buildUserPrompt(params.question, params.knowledgeContent),
            },
        ];
    }
    buildUserPrompt(question, knowledgeContent) {
        return `## CONTEXTO DE CONOCIMIENTO\n${knowledgeContent}\n\n## PREGUNTA DEL USUARIO\n${question}\n\n## RESPUESTA (en español, breve y accionable)`;
    }
}
exports.OllamaLlmProvider = OllamaLlmProvider;
