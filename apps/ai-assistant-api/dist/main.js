"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
require("reflect-metadata");
const core_1 = require("@nestjs/core");
const app_module_1 = require("./app.module");
const assistant_auth_config_service_1 = require("./assistant/assistant-auth-config.service");
async function bootstrap() {
    const app = await core_1.NestFactory.create(app_module_1.AppModule);
    const authConfigService = app.get(assistant_auth_config_service_1.AssistantAuthConfigService);
    authConfigService.assertValidForStartup();
    app.enableCors({
        origin: ["http://localhost:3000"],
        methods: ["GET", "POST", "OPTIONS"],
        allowedHeaders: ["Content-Type", "X-Tenant-Id", "Authorization"],
        credentials: false,
    });
    const port = process.env.PORT || 4001;
    await app.listen(port);
    console.log(`AI Assistant API running on http://localhost:${port}`);
    console.log("Assistant auth status:", authConfigService.getPublicStatus());
}
bootstrap();
