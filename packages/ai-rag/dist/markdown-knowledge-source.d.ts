import type { RagKnowledgeDocument, RagKnowledgeSource } from "./types";
export declare class MarkdownKnowledgeSource implements RagKnowledgeSource {
    private readonly knowledgeBasePath;
    constructor(knowledgeBasePath: string);
    listDocuments(appId: string): Promise<RagKnowledgeDocument[]>;
    private extractMetadata;
    private asString;
    private asStringArray;
    private hash;
}
