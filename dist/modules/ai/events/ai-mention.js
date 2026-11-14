/**
 * MessageCreate event listener for direct bot mentions and conversation triggers.
 * Automatically replies when members ping @NEXUS AI or reply to its messages.
 */
import { Events } from "discord.js";
import { AI } from "../../../config/features.js";
import { createModuleLogger } from "../../../utils/logger.js";
import { aiOrchestratorService } from "../services/ai-orchestrator.service.js";
const logger = createModuleLogger("event:aiMention");
export const aiMentionEvent = {
    name: Events.MessageCreate,
    once: false,
    module: AI,
    async execute(message) {
        if (message.author.bot || !message.guild || !message.client.user)
            return;
        // Check if the bot was directly mentioned or replied to
        const isMentioned = message.mentions.has(message.client.user);
        if (!isMentioned)
            return;
        // Strip bot mention pattern (<@botId> or <@!botId>)
        const mentionRegex = new RegExp(`<@!?${message.client.user.id}>`, "g");
        const cleanPrompt = message.content.replace(mentionRegex, "").trim();
        if (!cleanPrompt) {
            if ("reply" in message && typeof message.reply === "function") {
                await message.reply("Hello! 👋 How can I help you today? You can ask me any question or run `/help`!");
            }
            return;
        }
        try {
            if ("sendTyping" in message.channel && typeof message.channel.sendTyping === "function") {
                await message.channel.sendTyping();
            }
            const response = await aiOrchestratorService.ask(message.guild.id, message.author.id, message.author.username, cleanPrompt);
            if ("reply" in message && typeof message.reply === "function") {
                await message.reply({
                    content: response.text.slice(0, 2000),
                });
            }
        }
        catch (err) {
            logger.error({ err: err.message }, "Error generating AI response for direct mention");
        }
    },
};
//# sourceMappingURL=ai-mention.js.map