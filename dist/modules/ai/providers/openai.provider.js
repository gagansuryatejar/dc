/**
 * OpenAI cloud AI provider for NEXUS AI.
 * Communicates with OpenAI-compatible REST endpoints.
 */
import { config } from "../../../config/index.js";
import { createModuleLogger } from "../../../utils/logger.js";
const logger = createModuleLogger("ai:openai");
export class OpenAIProvider {
    name = "openai";
    model = "gpt-4o-mini";
    apiKey = config.ai.openaiApiKey;
    isAvailable() {
        return Boolean(this.apiKey && this.apiKey.trim().length > 0);
    }
    async generateResponse(messages, options = {}) {
        if (!this.isAvailable()) {
            throw new Error("OpenAI API key is not configured");
        }
        const endpoint = "https://api.openai.com/v1/chat/completions";
        const payload = {
            model: this.model,
            messages: messages.map((m) => ({
                role: m.role,
                content: m.content,
            })),
            temperature: options.temperature ?? 0.7,
            max_tokens: options.maxTokens ?? 1000,
        };
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 15_000);
        try {
            const response = await fetch(endpoint, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${this.apiKey}`,
                },
                body: JSON.stringify(payload),
                signal: controller.signal,
            });
            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`OpenAI API HTTP ${response.status}: ${errorText}`);
            }
            const data = (await response.json());
            const text = data.choices?.[0]?.message?.content || "I was unable to formulate a response.";
            const tokensUsed = data.usage?.total_tokens;
            return {
                text,
                provider: this.name,
                model: this.model,
                tokensUsed,
            };
        }
        catch (err) {
            logger.error({ err: err.message }, "OpenAI API request failed");
            throw err;
        }
        finally {
            clearTimeout(timeout);
        }
    }
    async healthCheck() {
        if (!this.isAvailable())
            return false;
        try {
            const res = await this.generateResponse([{ role: "user", content: "Ping" }], { maxTokens: 5 });
            return Boolean(res.text);
        }
        catch {
            return false;
        }
    }
}
export const openAIProvider = new OpenAIProvider();
//# sourceMappingURL=openai.provider.js.map