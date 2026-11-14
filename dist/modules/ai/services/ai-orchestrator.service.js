/**
 * AI Orchestration Engine for NEXUS AI.
 * Coordinates multi-provider execution (Gemini, OpenAI, Fallback),
 * response caching, conversation memory injection, and multilingual support (English & Telugu).
 */
import { geminiProvider } from "../providers/gemini.provider.js";
import { openAIProvider } from "../providers/openai.provider.js";
import { fallbackProvider } from "../providers/fallback.provider.js";
import { memoryService } from "./memory.service.js";
import { communityFactsService } from "./community-facts.service.js";
import { RateLimiter } from "../../../security/rate-limiter.js";
import { createModuleLogger } from "../../../utils/logger.js";
import { BOT_NAME, BOT_VERSION } from "../../../utils/constants.js";
const logger = createModuleLogger("ai:orchestrator");
export class AIOrchestratorService {
    providers;
    responseCache = new Map();
    userLimiter = new RateLimiter(60_000, 10); // 10 AI queries per minute per user
    constructor() {
        // Ordered provider priority chain
        this.providers = [geminiProvider, openAIProvider, fallbackProvider];
    }
    /**
     * Build the comprehensive NEXUS AI system instruction prompt.
     */
    async buildSystemPrompt(guildId, memberUsername, mode) {
        const relevantFacts = await communityFactsService.getAllFacts(guildId);
        const factsBlock = relevantFacts.length > 0
            ? `\n\nApproved Server Knowledge & FAQs:\n${relevantFacts.map((f) => `- [${f.key.toUpperCase()}]: ${f.content}`).join("\n")}`
            : "";
        let modeInstruction = "";
        if (mode === "creative") {
            modeInstruction = "\nTone: Be expressive, creative, and enthusiastic!";
        }
        else if (mode === "concise") {
            modeInstruction = "\nFormat: Provide extremely brief, direct answers in 1-3 sentences.";
        }
        else if (mode === "telugu") {
            modeInstruction =
                "\nLanguage: You must respond in natural, polite Telugu script (తెలుగు లిపి). Provide friendly, helpful answers in Telugu.";
        }
        return (`You are ${BOT_NAME} v${BOT_VERSION}, the Next Generation AI-Powered Discord Community Operating System.\n` +
            `Personality: Friendly, intelligent, witty, helpful, and community-minded.\n` +
            `User you are speaking with: ${memberUsername}.\n` +
            `Multilingual Capabilities: You fluently understand and reply in English and Telugu (తెలుగు).\n` +
            `Guidelines:\n` +
            `- Keep responses concise, clear, and well-formatted with Markdown.\n` +
            `- Use emojis where appropriate to maintain an engaging Discord atmosphere.\n` +
            `- If asked about server rules, leveling, or commands, provide accurate information.\n` +
            `- Never fabricate rules or administrative policies not present in the context.` +
            factsBlock +
            modeInstruction);
    }
    /**
     * Checks and consumes rate limit for a user.
     */
    checkRateLimit(userId) {
        return this.userLimiter.consume(userId);
    }
    /**
     * Primary conversational query handler.
     */
    async ask(guildId, userId, username, query, options = {}) {
        // Rate limit check
        const rateCheck = this.userLimiter.consume(userId);
        if (rateCheck.limited) {
            return {
                text: `⏳ You are asking questions too quickly! Please wait ${Math.ceil(rateCheck.resetInMs / 1000)}s before your next query.`,
                provider: "rate-limiter",
                model: "internal",
            };
        }
        // Check response cache
        const cacheKey = `${guildId}:${options.mode || "normal"}:${query.toLowerCase().trim()}`;
        const cached = this.responseCache.get(cacheKey);
        if (cached && Date.now() < cached.expiresAt) {
            logger.debug({ cacheKey }, "Serving AI response from in-memory cache");
            return cached.response;
        }
        // Gather history if enabled
        const useMemory = options.useMemory !== false;
        const history = useMemory ? await memoryService.getHistory(guildId, userId, 6) : [];
        // System instruction
        const systemPrompt = await this.buildSystemPrompt(guildId, username, options.mode);
        const messages = [
            { role: "system", content: systemPrompt },
            ...history,
            { role: "user", content: query },
        ];
        let result = null;
        // Execute provider fallback chain
        for (const provider of this.providers) {
            if (!provider.isAvailable())
                continue;
            try {
                logger.info({ provider: provider.name }, "Dispatching query to AI provider");
                result = await provider.generateResponse(messages, {
                    language: options.mode === "telugu" ? "te" : undefined,
                    temperature: options.mode === "creative" ? 0.9 : options.mode === "concise" ? 0.3 : 0.7,
                });
                if (result && result.text)
                    break;
            }
            catch (err) {
                logger.warn({ provider: provider.name, error: err.message }, "AI provider failed; falling back to next provider");
            }
        }
        if (!result) {
            // Ultimate fallback
            result = await fallbackProvider.generateResponse(messages, {
                language: options.mode === "telugu" ? "te" : undefined,
            });
        }
        // Save to user conversational memory
        if (useMemory && result.text) {
            await memoryService.addMessage(guildId, userId, "user", query);
            await memoryService.addMessage(guildId, userId, "assistant", result.text);
        }
        // Cache successful response for 5 minutes
        this.responseCache.set(cacheKey, {
            response: result,
            expiresAt: Date.now() + 5 * 60 * 1000,
        });
        return result;
    }
    /**
     * Summarizes channel discussion context.
     */
    async summarize(_guildId, channelName, recentMessages) {
        const prompt = `Summarize the following recent discussion in the #${channelName} Discord channel.\n` +
            `Highlight the key topics discussed, any decisions made, and interesting takeaways in 3-5 bullet points:\n\n` +
            recentMessages.join("\n");
        const messages = [
            {
                role: "system",
                content: "You are an expert community conversational summarizer. Be accurate, neutral, and clear.",
            },
            { role: "user", content: prompt },
        ];
        for (const provider of this.providers) {
            if (!provider.isAvailable())
                continue;
            try {
                const res = await provider.generateResponse(messages, { maxTokens: 400 });
                if (res && res.text)
                    return res.text;
            }
            catch { }
        }
        return "Unable to generate summary at this time. Discussion was active with various community topics.";
    }
    /**
     * Drafts an attractive community announcement.
     */
    async draftAnnouncement(_guildId, topic, tone = "enthusiastic") {
        const prompt = `Draft an engaging Discord community announcement about:\n"${topic}"\n\n` +
            `Tone: ${tone}. Include emojis, clear formatting, and call-to-action sections suitable for Discord embeds.`;
        const messages = [
            {
                role: "system",
                content: `You are ${BOT_NAME}, an expert community manager drafting server announcements.`,
            },
            { role: "user", content: prompt },
        ];
        for (const provider of this.providers) {
            if (!provider.isAvailable())
                continue;
            try {
                const res = await provider.generateResponse(messages, { maxTokens: 600 });
                if (res && res.text)
                    return res.text;
            }
            catch { }
        }
        return `📢 **COMMUNITY ANNOUNCEMENT**\n\n${topic}\n\n*Stay tuned for further updates from the moderation team!*`;
    }
    getActiveProviders() {
        return this.providers.filter((p) => p.isAvailable()).map((p) => p.name);
    }
    /**
     * Generic prompt generator for helper services (Pulse, Companion, Trivia).
     */
    async generate(_guildId, systemPrompt, userPrompt, _options = {}) {
        const messages = [
            { role: "system", content: systemPrompt },
            { role: "user", content: userPrompt },
        ];
        for (const provider of this.providers) {
            if (!provider.isAvailable())
                continue;
            try {
                const res = await provider.generateResponse(messages, { maxTokens: 600 });
                if (res && res.text) {
                    return { content: res.text, provider: provider.name };
                }
            }
            catch { }
        }
        return { content: "", provider: "fallback" };
    }
    /**
     * Directly generates response using provider fallback chain (Gemini -> OpenAI -> Fallback).
     */
    async generateResponse(messages, options = {}) {
        for (const provider of this.providers) {
            if (!provider.isAvailable())
                continue;
            try {
                const res = await provider.generateResponse(messages, options);
                if (res && res.text)
                    return res;
            }
            catch (err) {
                logger.warn({ provider: provider.name, err }, "Provider generation failed, falling back");
            }
        }
        return fallbackProvider.generateResponse(messages, options);
    }
}
export const aiOrchestratorService = new AIOrchestratorService();
export const aiOrchestrator = aiOrchestratorService;
//# sourceMappingURL=ai-orchestrator.service.js.map