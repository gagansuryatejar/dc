/**
 * Google Gemini cloud AI provider for NEXUS AI.
 * Communicates with Google's Gemini models via REST with zero native bloat.
 */

import { config } from "../../../config/index.js";
import { createModuleLogger } from "../../../utils/logger.js";
import type {
  AIProvider,
  AIMessage,
  GenerateOptions,
  AIResponse,
} from "./ai-provider.interface.js";

const logger = createModuleLogger("ai:gemini");

export class GeminiProvider implements AIProvider {
  public readonly name = "gemini";
  private readonly model = "gemini-1.5-flash";
  private readonly apiKey = config.ai.geminiApiKey;

  isAvailable(): boolean {
    return Boolean(this.apiKey && this.apiKey.trim().length > 0);
  }

  async generateResponse(
    messages: AIMessage[],
    options: GenerateOptions = {},
  ): Promise<AIResponse> {
    if (!this.isAvailable()) {
      throw new Error("Gemini API key is not configured");
    }

    const isOAuthToken = this.apiKey.startsWith("AQ.") || this.apiKey.startsWith("ya29.");
    const endpoint = isOAuthToken
      ? `https://generativelanguage.googleapis.com/v1beta/models/${this.model}:generateContent`
      : `https://generativelanguage.googleapis.com/v1beta/models/${this.model}:generateContent?key=${this.apiKey}`;

    // Separate system instruction from conversation contents
    const systemMsgs = messages.filter((m) => m.role === "system");
    const conversationMsgs = messages.filter((m) => m.role !== "system");

    const systemInstructionText =
      options.systemPromptOverride ||
      (systemMsgs.length > 0 ? systemMsgs.map((m) => m.content).join("\n\n") : undefined);

    const contents = conversationMsgs.map((m) => ({
      role: m.role === "assistant" ? "model" : "user",
      parts: [{ text: m.content }],
    }));

    // Ensure contents are not empty
    if (contents.length === 0) {
      contents.push({ role: "user", parts: [{ text: "Hello NEXUS AI" }] });
    }

    const payload: Record<string, any> = {
      contents,
      generationConfig: {
        temperature: options.temperature ?? 0.7,
        maxOutputTokens: options.maxTokens ?? 1000,
      },
    };

    if (systemInstructionText) {
      payload.systemInstruction = {
        parts: [{ text: systemInstructionText }],
      };
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15_000); // 15-second timeout

    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };
    if (isOAuthToken) {
      headers["Authorization"] = `Bearer ${this.apiKey}`;
    } else {
      headers["x-goog-api-key"] = this.apiKey;
    }

    try {
      const response = await fetch(endpoint, {
        method: "POST",
        headers,
        body: JSON.stringify(payload),
        signal: controller.signal,
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Gemini API HTTP ${response.status}: ${errorText}`);
      }

      const data = (await response.json()) as any;
      const candidate = data.candidates?.[0];
      const text = candidate?.content?.parts?.[0]?.text || "I was unable to formulate a response.";
      const tokensUsed = data.usageMetadata?.totalTokenCount;

      return {
        text,
        provider: this.name,
        model: this.model,
        tokensUsed,
      };
    } catch (err: any) {
      logger.error({ err: err.message }, "Gemini API request failed");
      throw err;
    } finally {
      clearTimeout(timeout);
    }
  }

  async healthCheck(): Promise<boolean> {
    if (!this.isAvailable()) return false;
    try {
      const res = await this.generateResponse([{ role: "user", content: "Ping" }], { maxTokens: 5 });
      return Boolean(res.text);
    } catch {
      return false;
    }
  }
}

export const geminiProvider = new GeminiProvider();
