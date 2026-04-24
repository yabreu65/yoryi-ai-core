"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MarkdownKnowledgeSource = void 0;
const node_crypto_1 = require("node:crypto");
const node_fs_1 = require("node:fs");
const node_path_1 = require("node:path");
const DOC_TYPES = [
    { dir: "modules", type: "module" },
    { dir: "faq", type: "faq" },
    { dir: "flows", type: "flow" },
    { dir: "roles", type: "role" },
    { dir: "policies", type: "policy" },
];
class MarkdownKnowledgeSource {
    knowledgeBasePath;
    constructor(knowledgeBasePath) {
        this.knowledgeBasePath = knowledgeBasePath;
    }
    async listDocuments(appId) {
        const documents = [];
        for (const docType of DOC_TYPES) {
            const dirPath = (0, node_path_1.join)(this.knowledgeBasePath, appId, docType.dir);
            if (!(0, node_fs_1.existsSync)(dirPath)) {
                continue;
            }
            const files = (0, node_fs_1.readdirSync)(dirPath).filter((file) => file.endsWith(".md"));
            for (const fileName of files) {
                const filePath = (0, node_path_1.join)(dirPath, fileName);
                const rawContent = (0, node_fs_1.readFileSync)(filePath, "utf-8");
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
    extractMetadata(rawContent) {
        const frontmatterRegex = /^---\s*\n([\s\S]*?)\n---\s*/;
        const match = rawContent.match(frontmatterRegex);
        if (!match) {
            return { metadata: {}, content: rawContent };
        }
        const frontmatter = match[1] ?? "";
        const metadata = {};
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
            }
            else {
                metadata[key] = rawValue;
            }
        }
        return {
            metadata,
            content: rawContent.replace(frontmatterRegex, "").trim(),
        };
    }
    asString(value) {
        if (typeof value !== "string") {
            return undefined;
        }
        return value.trim().length > 0 ? value : undefined;
    }
    asStringArray(value) {
        if (!Array.isArray(value)) {
            return undefined;
        }
        const normalized = value
            .filter((item) => typeof item === "string")
            .map((item) => item.trim())
            .filter((item) => item.length > 0);
        return normalized.length > 0 ? normalized : undefined;
    }
    hash(value) {
        return (0, node_crypto_1.createHash)("sha256").update(value).digest("hex");
    }
}
exports.MarkdownKnowledgeSource = MarkdownKnowledgeSource;
