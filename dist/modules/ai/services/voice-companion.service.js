/**
 * Smart Voice Companion Service for NEXUS AI.
 * Provides voice room icebreakers, conversational discussion recaps,
 * and dynamic voice announcements.
 */
import { aiOrchestrator } from "./ai-orchestrator.service.js";
import { createModuleLogger } from "../../../utils/logger.js";
const logger = createModuleLogger("service:voice-companion");
export class VoiceCompanionService {
    defaultIcebreakers = [
        {
            category: "gaming",
            question: "If you could live in the universe of any game you've played this year, which one would you pick (and why wouldn't you die immediately)?",
            followUp: "What's the very first quest you'd embark on?",
        },
        {
            category: "gaming",
            question: "What is an underrated game that you think everybody in this voice channel should play right now?",
            followUp: "How many hours have you sunk into it?",
        },
        {
            category: "general",
            question: "If you could instantly become a world-class master at any skill without practicing, what would you choose?",
            followUp: "What would you create or do first?",
        },
        {
            category: "funny",
            question: "What is the weirdest food combination that you secretly love and defend passionately?",
            followUp: "Who did you introduce it to, and did they judge you?",
        },
        {
            category: "deep",
            question: "What's a piece of advice you heard years ago that you still think about regularly?",
            followUp: "Did it change how you make decisions today?",
        },
    ];
    /**
     * Generates a creative voice room icebreaker question.
     */
    async generateIcebreaker(guildId, category = "general") {
        try {
            const prompt = `Generate a single creative and engaging voice channel icebreaker question for Discord voice chat.
Category: ${category}
Output format: JSON with keys "question" and "followUp". Do not include extra text.`;
            const aiRes = await aiOrchestrator.generate(guildId, "system", prompt, { mode: "creative" });
            const match = aiRes.content.match(/\{[\s\S]*\}/);
            if (match) {
                const parsed = JSON.parse(match[0]);
                if (parsed.question) {
                    return {
                        category,
                        question: parsed.question,
                        followUp: parsed.followUp || "What do others in the room think?",
                    };
                }
            }
        }
        catch (err) {
            logger.debug({ err, category }, "Falling back to curated icebreaker bank");
        }
        // Curated fallback bank
        const filtered = this.defaultIcebreakers.filter((i) => i.category === category);
        const pool = filtered.length > 0 ? filtered : this.defaultIcebreakers;
        const picked = pool[Math.floor(Math.random() * pool.length)];
        return picked;
    }
    /**
     * Generates a structured recap of a voice room session based on bulleted notes or transcripts.
     */
    async generateMeetingRecap(guildId, channelName, notesOrPoints) {
        if (!notesOrPoints || notesOrPoints.length === 0) {
            return {
                channelName,
                topicsDiscussed: ["General voice chat hangout"],
                keyTakeaways: ["Casual community conversation with no formal agenda."],
                actionItems: ["Enjoy the server and stay connected!"],
                generatedAt: new Date().toISOString(),
            };
        }
        try {
            const prompt = `Synthesize a structured voice lounge recap from these discussion notes:
Channel: ${channelName}
Notes:
${notesOrPoints.map((n) => `- ${n}`).join("\n")}

Respond in strict JSON with keys:
- "topicsDiscussed": array of 2-4 strings
- "keyTakeaways": array of 2-3 strings
- "actionItems": array of 1-3 strings`;
            const aiRes = await aiOrchestrator.generate(guildId, "system", prompt, { mode: "concise" });
            const match = aiRes.content.match(/\{[\s\S]*\}/);
            if (match) {
                const parsed = JSON.parse(match[0]);
                return {
                    channelName,
                    topicsDiscussed: Array.isArray(parsed.topicsDiscussed) ? parsed.topicsDiscussed : notesOrPoints.slice(0, 3),
                    keyTakeaways: Array.isArray(parsed.keyTakeaways) ? parsed.keyTakeaways : ["Shared ideas and updates"],
                    actionItems: Array.isArray(parsed.actionItems) ? parsed.actionItems : ["Follow up in text channels"],
                    generatedAt: new Date().toISOString(),
                };
            }
        }
        catch (err) {
            logger.warn({ err }, "Fallback recap generated");
        }
        // Heuristic structured summary
        return {
            channelName,
            topicsDiscussed: notesOrPoints.slice(0, 3),
            keyTakeaways: [
                notesOrPoints[0] || "Active voice discussion concluded successfully.",
                "Community members aligned on key priorities.",
            ],
            actionItems: ["Review notes and continue collaboration in server channels."],
            generatedAt: new Date().toISOString(),
        };
    }
    /**
     * Generates a spoken-style announcement script for voice events.
     */
    async generateVoiceAnnouncement(guildId, title, details) {
        try {
            const prompt = `Write a short, engaging, 2-sentence voice announcement script for a Discord voice event.
Event Title: ${title}
Details: ${details}
Tone: Energetic, clear, community-oriented.`;
            const res = await aiOrchestrator.generate(guildId, "system", prompt, { mode: "concise" });
            if (res.content && res.content.length > 20 && res.content.includes(title)) {
                return res.content.trim();
            }
        }
        catch {
            // Fall through to template
        }
        return `Attention community! We're kicking off **${title}** right now in voice: ${details}. Hop in and join the fun!`;
    }
}
export const voiceCompanionService = new VoiceCompanionService();
//# sourceMappingURL=voice-companion.service.js.map