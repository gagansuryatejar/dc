/**
 * Community Memory & Server Lore Slash Command for NEXUS AI.
 * Stores and recalls community lore, quotes, milestones, and inside jokes.
 */
import { SlashCommandBuilder, PermissionFlagsBits, } from "discord.js";
import { PermissionLevel } from "../../../types/index.js";
import { AI } from "../../../config/features.js";
import { communityLoreService } from "../services/community-lore.service.js";
import { createBaseEmbed, createSuccessEmbed, createErrorEmbed, Colors, } from "../../../utils/embeds.js";
export const loreCommand = {
    module: AI,
    permissions: PermissionLevel.MEMBER,
    data: new SlashCommandBuilder()
        .setName("lore")
        .setDescription("Community Memory: Store, recall, and share memorable server lore & quotes")
        .addSubcommand((sub) => sub
        .setName("add")
        .setDescription("Record a memorable server quote, inside joke, or milestone into community memory")
        .addStringOption((opt) => opt.setName("topic").setDescription("Short identifier or topic title (e.g. raid_night_2026)").setRequired(true))
        .addStringOption((opt) => opt.setName("content").setDescription("The quote, story, or lore text").setRequired(true))
        .addStringOption((opt) => opt
        .setName("category")
        .setDescription("Category of the lore entry")
        .setRequired(false)
        .addChoices({ name: "Server Lore & Legends", value: "lore" }, { name: "Memorable Quote", value: "quote" }, { name: "Server Milestone", value: "milestone" }, { name: "Inside Joke", value: "inside_joke" })))
        .addSubcommand((sub) => sub
        .setName("recall")
        .setDescription("Recall a server lore entry by topic or keyword")
        .addStringOption((opt) => opt.setName("topic").setDescription("Topic or keyword to look up").setRequired(true)))
        .addSubcommand((sub) => sub.setName("random").setDescription("Recall a random memorable quote or piece of server lore"))
        .addSubcommand((sub) => sub
        .setName("list")
        .setDescription("Browse the server lore archives")
        .addStringOption((opt) => opt
        .setName("category")
        .setDescription("Filter by category")
        .setRequired(false)
        .addChoices({ name: "Lore & Legends", value: "lore" }, { name: "Quotes", value: "quote" }, { name: "Milestones", value: "milestone" }, { name: "Inside Jokes", value: "inside_joke" })))
        .addSubcommand((sub) => sub
        .setName("delete")
        .setDescription("Delete a server lore entry (creator or moderator only)")
        .addStringOption((opt) => opt.setName("topic").setDescription("Topic of the lore entry to remove").setRequired(true))),
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
        // ── Subcommand: add ─────────────────────────────────────
        if (sub === "add") {
            await interaction.deferReply();
            const topic = interaction.options.getString("topic", true);
            const content = interaction.options.getString("content", true);
            const category = interaction.options.getString("category") || "lore";
            try {
                const entry = await communityLoreService.addLore(guildId, {
                    topic,
                    content,
                    submittedBy: interaction.user.id,
                    submitterTag: interaction.user.username,
                    category,
                });
                const embed = createSuccessEmbed("Lore Preserved in Server Memory!", `Successfully saved under topic: **\`${entry.topic}\`**\nCategory: \`${entry.category}\`\n\n> "${entry.content}"`);
                await interaction.editReply({ embeds: [embed] });
            }
            catch (error) {
                await interaction.editReply({
                    embeds: [createErrorEmbed("Error", "Could not save server lore entry.")],
                });
            }
            return;
        }
        // ── Subcommand: recall ──────────────────────────────────
        if (sub === "recall") {
            await interaction.deferReply();
            const topic = interaction.options.getString("topic", true);
            try {
                const entry = await communityLoreService.getLore(guildId, topic);
                if (!entry) {
                    await interaction.editReply({
                        embeds: [
                            createErrorEmbed("Lore Not Found", `No community memory found matching **\`${topic}\`**. Add it using \`/lore add\`!`),
                        ],
                    });
                    return;
                }
                const embed = createBaseEmbed()
                    .setColor(Colors.PRIMARY)
                    .setTitle(`📜 Server Lore: ${entry.topic}`)
                    .setDescription(`> "${entry.content}"`)
                    .addFields({ name: "🏷️ Category", value: `\`${entry.category}\``, inline: true }, { name: "✍️ Added By", value: `<@${entry.submittedBy}>`, inline: true }, { name: "⭐ Upvotes", value: `${entry.upvotes}`, inline: true })
                    .setFooter({ text: `Recorded on ${entry.createdAt.toLocaleDateString()}` });
                await interaction.editReply({ embeds: [embed] });
            }
            catch (error) {
                await interaction.editReply({
                    embeds: [createErrorEmbed("Error", "Could not retrieve lore entry.")],
                });
            }
            return;
        }
        // ── Subcommand: random ──────────────────────────────────
        if (sub === "random") {
            await interaction.deferReply();
            try {
                const entry = await communityLoreService.getRandomLore(guildId);
                if (!entry) {
                    await interaction.editReply({
                        embeds: [
                            createErrorEmbed("Empty Archives", "No community lore or quotes have been recorded yet. Be the first with `/lore add`!"),
                        ],
                    });
                    return;
                }
                const embed = createBaseEmbed()
                    .setColor(Colors.ACCENT)
                    .setTitle(`🎲 Random Server Memory: ${entry.topic}`)
                    .setDescription(`> "${entry.content}"`)
                    .addFields({ name: "🏷️ Category", value: `\`${entry.category}\``, inline: true }, { name: "✍️ Submitter", value: `<@${entry.submittedBy}>`, inline: true }, { name: "⭐ Upvotes", value: `${entry.upvotes}`, inline: true });
                await interaction.editReply({ embeds: [embed] });
            }
            catch (error) {
                await interaction.editReply({
                    embeds: [createErrorEmbed("Error", "Could not fetch random lore entry.")],
                });
            }
            return;
        }
        // ── Subcommand: list ────────────────────────────────────
        if (sub === "list") {
            await interaction.deferReply();
            const category = interaction.options.getString("category") || undefined;
            try {
                const list = await communityLoreService.listLore(guildId, category, 15);
                if (list.length === 0) {
                    await interaction.editReply({
                        embeds: [createErrorEmbed("Archives Empty", "No entries found in this category.")],
                    });
                    return;
                }
                const lines = list.map((e, i) => `**#${i + 1}** \`${e.topic}\` (${e.category}) — ⭐ ${e.upvotes}\n> _"${e.content.slice(0, 70)}${e.content.length > 70 ? "..." : ""}"_`);
                const embed = createBaseEmbed()
                    .setColor(Colors.PRIMARY)
                    .setTitle(`📚 Server Lore Archives (${list.length} entries)`)
                    .setDescription(lines.join("\n\n"));
                await interaction.editReply({ embeds: [embed] });
            }
            catch (error) {
                await interaction.editReply({
                    embeds: [createErrorEmbed("Error", "Could not retrieve lore archives.")],
                });
            }
            return;
        }
        // ── Subcommand: delete ──────────────────────────────────
        if (sub === "delete") {
            await interaction.deferReply({ ephemeral: true });
            const topic = interaction.options.getString("topic", true);
            const isAdmin = interaction.memberPermissions?.has(PermissionFlagsBits.ManageGuild) ||
                interaction.memberPermissions?.has(PermissionFlagsBits.Administrator) ||
                false;
            try {
                const res = await communityLoreService.deleteLore(guildId, topic, interaction.user.id, isAdmin);
                if (!res.success) {
                    await interaction.editReply({
                        embeds: [createErrorEmbed("Delete Failed", res.reason || "Unable to remove entry.")],
                    });
                    return;
                }
                await interaction.editReply({
                    embeds: [createSuccessEmbed("Lore Deleted", `Successfully removed **\`${topic}\`** from memory.`)],
                });
            }
            catch (error) {
                await interaction.editReply({
                    embeds: [createErrorEmbed("Error", "Could not delete lore entry.")],
                });
            }
            return;
        }
    },
};
//# sourceMappingURL=lore.js.map