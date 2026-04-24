import { createHash } from "node:crypto";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import type {
  RagDocumentType,
  RagKnowledgeDocument,
  RagKnowledgeSource,
} from "./types";

const DOC_TYPES: Array<{ dir: string; type: RagDocumentType }> = [
  { dir: "modules", type: "module" },
  { dir: "faq", type: "faq" },
  { dir: "flows", type: "flow" },
  { dir: "roles", type: "role" },
  { dir: "policies", type: "policy" },
];

type FrontmatterData = {
  module?: string;
  roleScope?: string[];
  [key: string]: unknown;
};

export class MarkdownKnowledgeSource implements RagKnowledgeSource {
  constructor(private readonly knowledgeBasePath: string) {}

  async listDocuments(appId: string): Promise<RagKnowledgeDocument[]> {
    const documents: RagKnowledgeDocument[] = [];

    for (const docType of DOC_TYPES) {
      const dirPath = join(this.knowledgeBasePath, appId, docType.dir);
      if (!existsSync(dirPath)) {
        continue;
      }

      const files = readdirSync(dirPath).filter((file) => file.endsWith(".md"));
      for (const fileName of files) {
        const filePath = join(dirPath, fileName);
        const rawContent = readFileSync(filePath, "utf-8");
        const { metadata, content } = this.extractMetadata(rawContent);

        documents.push({
          appId,
          type: docType.type,
          filePath,
          fileName,
          content,
          module: this.asString(metadata.module),
          roleScope: this.asStringArray(metadata.roleScope),
          metadata: metadata,
          checksum: this.hash(`${filePath}:${content}`),
        });
      }
    }

    return documents;
  }

  private extractMetadata(rawContent: string): {
    metadata: FrontmatterData;
    content: string;
  } {
    const frontmatterRegex = /^---\s*\n([\s\S]*?)\n---\s*/;
    const match = rawContent.match(frontmatterRegex);
    if (!match) {
      return { metadata: {}, content: rawContent };
    }

    const frontmatter = match[1] ?? "";
    const metadata: FrontmatterData = {};
    for (const line of frontmatter.split("\n")) {
      const colonIndex = line.indexOf(":");
      if (colonIndex === -1) {
        continue;
      }
      const key = line.slice(0, colonIndex).trim();
      const rawValue = line.slice(colonIndex + 1).trim();
      if (rawValue.startsWith("[") && rawValue.endsWith("]")) {
        metadata[key] = rawValue
          .slice(1, -1)
          .split(",")
          .map((value) => value.trim())
          .filter((value) => value.length > 0);
      } else {
        metadata[key] = rawValue;
      }
    }

    return {
      metadata,
      content: rawContent.replace(frontmatterRegex, "").trim(),
    };
  }

  private asString(value: unknown): string | undefined {
    if (typeof value !== "string") {
      return undefined;
    }
    return value.trim().length > 0 ? value : undefined;
  }

  private asStringArray(value: unknown): string[] | undefined {
    if (!Array.isArray(value)) {
      return undefined;
    }

    const normalized = value
      .filter((item): item is string => typeof item === "string")
      .map((item) => item.trim())
      .filter((item) => item.length > 0);

    return normalized.length > 0 ? normalized : undefined;
  }

  private hash(value: string): string {
    return createHash("sha256").update(value).digest("hex");
  }
}
