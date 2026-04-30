import "reflect-metadata";
import "dotenv/config";
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
  
}

bootstrap();
