import "reflect-metadata";
import { NestFactory } from "@nestjs/core";
import { AppModule } from "./app.module";
import { AssistantAuthConfigService } from "./assistant/assistant-auth-config.service";

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const authConfigService = app.get(AssistantAuthConfigService);
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
