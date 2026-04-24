import { createServer } from "http";
import { join } from "node:path";
import { BuildingOSAdapter } from "@yoryi/ai-adapters";
import { ChatService, KnowledgeService } from "@yoryi/ai-core";

const adapter = new BuildingOSAdapter();

const knowledgeBasePath = join(process.cwd(), "..", "..", "knowledge");
const knowledgeService = new KnowledgeService(knowledgeBasePath);

const chatService = new ChatService(adapter, knowledgeService);

const port = 4001;

const server = createServer(async (req, res) => {
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

  async function handleChatRequest(request: any, response: any) {
    let body = "";

    request.on("data", (chunk: string) => {
      body += chunk;
    });

    request.on("end", async () => {
      try {
        const parsedBody = JSON.parse(body) as {
          message: string;
          context: {
            appId: string;
            tenantId?: string;
            userId: string;
            role: string;
            route: string;
            unitOccupantRole?: "OWNER" | "RESIDENT";
          };
        };

        const result = await chatService.handle({
          message: parsedBody.message,
          context: parsedBody.context,
        });

        response.writeHead(200, { "Content-Type": "application/json" });
        response.end(JSON.stringify(result, null, 2));
      } catch (error) {
        response.writeHead(400, { "Content-Type": "application/json" });
        response.end(
          JSON.stringify(
            {
              error: "Invalid request payload",
              details: error instanceof Error ? error.message : "Unknown error",
            },
            null,
            2
          )
        );
      }
    });
  }
});

server.listen(port, () => {
  console.log(`AI Assistant API running on http://localhost:${port}`);
  console.log(`Knowledge base path: ${knowledgeBasePath}`);
});