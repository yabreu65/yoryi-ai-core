"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const http_1 = require("http");
const node_path_1 = require("node:path");
const ai_adapters_1 = require("@yoryi/ai-adapters");
const ai_core_1 = require("@yoryi/ai-core");
const adapter = new ai_adapters_1.BuildingOSAdapter();
const knowledgeBasePath = (0, node_path_1.join)(process.cwd(), "..", "..", "knowledge");
const knowledgeService = new ai_core_1.KnowledgeService(knowledgeBasePath);
const chatService = new ai_core_1.ChatService(adapter, knowledgeService);
const port = 4001;
const server = (0, http_1.createServer)(async (req, res) => {
    // CORS headers
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type, X-Tenant-Id, Authorization");
    if (req.method === "OPTIONS") {
        res.writeHead(204);
        res.end();
        return;
    }
    const url = req.url || "";
    // POST /assistant/chat - direct path
    if (req.method === "POST" && url === "/assistant/chat") {
        await handleChatRequest(req, res);
        return;
    }
    // POST /tenants/{tenantId}/assistant/{tenantId}/chat - frontend path
    const tenantChatMatch = url.match(/^\/tenants\/([^/]+)\/assistant\/[^/]+\/chat$/);
    if (req.method === "POST" && tenantChatMatch) {
        await handleChatRequest(req, res);
        return;
    }
    // GET /health
    if (req.method === "GET" && url === "/health") {
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ status: "ok", service: "ai-assistant-api" }));
        return;
    }
    res.writeHead(404, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: "Not found" }));
    async function handleChatRequest(request, response) {
        let body = "";
        request.on("data", (chunk) => {
            body += chunk;
        });
        request.on("end", async () => {
            try {
                const parsedBody = JSON.parse(body);
                const result = await chatService.handle({
                    message: parsedBody.message,
                    context: parsedBody.context,
                });
                response.writeHead(200, { "Content-Type": "application/json" });
                response.end(JSON.stringify(result, null, 2));
            }
            catch (error) {
                response.writeHead(400, { "Content-Type": "application/json" });
                response.end(JSON.stringify({
                    error: "Invalid request payload",
                    details: error instanceof Error ? error.message : "Unknown error",
                }, null, 2));
            }
        });
    }
});
server.listen(port, () => {
    console.log(`AI Assistant API running on http://localhost:${port}`);
    console.log(`Knowledge base path: ${knowledgeBasePath}`);
});
