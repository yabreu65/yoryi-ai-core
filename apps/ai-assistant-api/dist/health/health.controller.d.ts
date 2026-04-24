import { AssistantAuthConfigService } from "../assistant/assistant-auth-config.service";
import type { HealthResponse } from "./health-response.dto";
export declare class HealthController {
    private readonly assistantAuthConfigService;
    constructor(assistantAuthConfigService: AssistantAuthConfigService);
    check(): HealthResponse;
}
