/**
 * Smart Voice Companion Slash Command for NEXUS AI.
 * Provides voice room icebreakers, recaps, and announcements.
 */
import { SlashCommandBuilder } from "discord.js";
import { PermissionLevel } from "../../../types/index.js";
import { AI } from "../../../config/features.js";
import { voiceCompanionService } from "../services/voice-companion.service.js";
import { createBaseEmbed, createErrorEmbed, Colors } from "../../../utils/embeds.js";
export const companionCommand = {
    module: AI,
    permissions: PermissionLevel.MEMBER,
    data: new SlashCommandBuilder()
        .setName("companion")
        .setDescription("AI Smart Voice Companion utilities, icebreakers, and discussion recaps")
        .addSubcommand((sub) => sub
        .setName("icebreaker")
        .setDescription("Generate a voice room conversation starter question")
        .addStringOption((opt) => opt
        .setName("category")
        .setDescription("Icebreaker theme")
        .setRequired(false)
        .addChoices({ name: "General (Creative)", value: "general" }, { name: "Gaming & Worlds", value: "gaming" }, { name: "Funny & Weird", value: "funny" }, { name: "Deep & Thoughtful", value: "deep" })))
        .addSubcommand((sub) => sub
        .setName("recap")
        .setDescription("Generate a structured recap of a voice lounge session")
        .addStringOption((opt) => opt
        .setName("notes")
        .setDescription("Comma or semicolon separated notes / topics from the call")
        .setRequired(true))
        .addStringOption((opt) => opt.setName("room").setDescription("Voice channel name").setRequired(false)))
        .addSubcommand((sub) => sub
        .setName("announce")
        .setDescription("Generate a spoken-style announcement script for a voice room event")
        .addStringOption((opt) => opt.setName("title").setDescription("Event or activity name").setRequired(true))
        .addStringOption((opt) => opt.setName("details").setDescription("Key event details").setRequired(true))),
    async execute(interaction) {
        const guildId = interaction.guildId;
        if (!guildId) {
            await interaction.reply({
                embeds: [createErrorEmbed("Guild Only", "This command can only be used in a Discord server.")],
                ephemeral: true,
            });
            return;
        }
        const sub = interaction.options.getSubcommand();
        // ── Subcommand: icebreaker ──────────────────────────────
        if (sub === "icebreaker") {
            await interaction.deferReply();
            const category = interaction.options.getString("category") || "general";
            try {
                const icebreaker = await voiceCompanionService.generateIcebreaker(guildId, category);
                const embed = createBaseEmbed()
                    .setColor(Colors.PRIMARY)
                    .setTitle("🎙️ Voice Lounge Icebreaker")
                    .setDescription(`**"${icebreaker.question}"**`)
                    .addFields({
                    name: "💬 Follow-up Spark",
                    value: `_${icebreaker.followUp}_`,
                    inline: false,
                })
                    .setFooter({ text: `Theme: ${icebreaker.category.toUpperCase()} • NEXUS Smart Companion` });
                await interaction.editReply({ embeds: [embed] });
            }
            catch (error) {
                await interaction.editReply({
                    embeds: [createErrorEmbed("Error", "Could not generate voice icebreaker.")],
                });
            }
            return;
        }
        // ── Subcommand: recap ───────────────────────────────────
        if (sub === "recap") {
            await interaction.deferReply();
            const rawNotes = interaction.options.getString("notes", true);
            const roomName = interaction.options.getString("room") || "Community Voice Lounge";
            const points = rawNotes
                .split(/[,;\n]+/)
                .map((p) => p.trim())
                .filter((p) => p.length > 0);
            try {
                const recap = await voiceCompanionService.generateMeetingRecap(guildId, roomName, points);
                const embed = createBaseEmbed()
                    .setColor(Colors.SUCCESS)
                    .setTitle(`📝 Voice Lounge Recap: ${recap.channelName}`)
                    .addFields({
                    name: "🗣️ Main Discussion Topics",
                    value: recap.topicsDiscussed.map((t) => `• ${t}`).join("\n"),
                    inline: false,
                }, {
                    name: "📌 Key Takeaways",
                    value: recap.keyTakeaways.map((k) => `• ${k}`).join("\n"),
                    inline: false,
                }, {
                    name: "✅ Action Items",
                    value: recap.actionItems.map((a) => `• ${a}`).join("\n"),
                    inline: false,
                });
                await interaction.editReply({ embeds: [embed] });
            }
            catch (error) {
                await interaction.editReply({
                    embeds: [createErrorEmbed("Error", "Could not compile voice discussion recap.")],
                });
            }
            return;
        }
        // ── Subcommand: announce ────────────────────────────────
        if (sub === "announce") {
            await interaction.deferReply();
            const title = interaction.options.getString("title", true);
            const details = interaction.options.getString("details", true);
            try {
                const script = await voiceCompanionService.generateVoiceAnnouncement(guildId, title, details);
                const embed = createBaseEmbed()
                    .setColor(Colors.ACCENT)
                    .setTitle(`📢 Voice Announcement: ${title}`)
                    .setDescription(`**Spoken Script:**\n> "${script}"\n\n*Read this script aloud in voice or broadcast to community channels.*`);
                await interaction.editReply({ embeds: [embed] });
            }
            catch (error) {
                await interaction.editReply({
                    embeds: [createErrorEmbed("Error", "Could not draft voice announcement script.")],
                });
            }
            return;
        }
    },
};
//# sourceMappingURL=companion.js.map