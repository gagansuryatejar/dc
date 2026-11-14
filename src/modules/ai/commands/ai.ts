/**
 * /ai slash command group.
 * Natural language chat, channel summaries, announcements, conversational memory management,
 * and approved server knowledge FAQs (supports English and Telugu).
 */

import {
  SlashCommandBuilder,
  ChatInputCommandInteraction,
  EmbedBuilder,
  PermissionFlagsBits,
  type TextChannel,
} from "discord.js";
import { AI } from "../../../config/features.js";
import { PermissionLevel, type NexusCommand } from "../../../types/index.js";
import { Colors, createErrorEmbed, createSuccessEmbed } from "../../../utils/embeds.js";
import { FOOTER_TEXT, EMOJIS } from "../../../utils/constants.js";
import { aiOrchestratorService, type AskOptions } from "../services/ai-orchestrator.service.js";
import { memoryService } from "../services/memory.service.js";
import { communityFactsService } from "../services/community-facts.service.js";
import { sanitizeString } from "../../../security/validators.js";

export const aiCommand: NexusCommand = {
  data: new SlashCommandBuilder()
    .setName("ai")
    .setDescription("NEXUS AI intelligent conversation, summaries, memory, and FAQs")
    .addSubcommand((sub) =>
      sub
        .setName("ask")
        .setDescription("Ask NEXUS AI a question or start an intelligent conversation")
        .addStringOption((opt) =>
          opt
            .setName("prompt")
            .setDescription("Your question or message (English or Telugu / తెలుగు)")
            .setMaxLength(1000)
            .setRequired(true),
        )
        .addStringOption((opt) =>
          opt
            .setName("mode")
            .setDescription("Conversation style")
            .setRequired(false)
            .addChoices(
              { name: "Normal (Balanced & Friendly)", value: "normal" },
              { name: "Creative (Expressive & Witty)", value: "creative" },
              { name: "Concise (Brief & Direct)", value: "concise" },
              { name: "Telugu (తెలుగు భాషలో సమాధానం)", value: "telugu" },
            ),
        ),
    )
    .addSubcommand((sub) =>
      sub
        .setName("summarize")
        .setDescription("Summarize recent discussion in this channel")
        .addIntegerOption((opt) =>
          opt
            .setName("limit")
            .setDescription("Number of recent messages to analyze (10–50, default: 25)")
            .setMinValue(10)
            .setMaxValue(50)
            .setRequired(false),
        ),
    )
    .addSubcommand((sub) =>
      sub
        .setName("announce")
        .setDescription("Draft a structured community announcement")
        .addStringOption((opt) =>
          opt
            .setName("topic")
            .setDescription("The subject or event details of the announcement")
            .setMaxLength(500)
            .setRequired(true),
        )
        .addStringOption((opt) =>
          opt
            .setName("tone")
            .setDescription("Tone of the announcement")
            .setRequired(false)
            .addChoices(
              { name: "Enthusiastic & Hype", value: "enthusiastic" },
              { name: "Professional & Official", value: "professional" },
              { name: "Casual & Friendly", value: "casual" },
            ),
        ),
    )
    .addSubcommand((sub) =>
      sub
        .setName("memory")
        .setDescription("Inspect or wipe your private conversational memory")
        .addStringOption((opt) =>
          opt
            .setName("action")
            .setDescription("Memory management action")
            .setRequired(true)
            .addChoices(
              { name: "View Context (Inspect stored messages)", value: "view" },
              { name: "Wipe Memory (Delete private history)", value: "clear" },
            ),
        ),
    )
    .addSubcommand((sub) =>
      sub
        .setName("faq")
        .setDescription("Query approved community knowledge base and server FAQs")
        .addStringOption((opt) =>
          opt
            .setName("query")
            .setDescription("Search topic (e.g. rules, schedule, roles)")
            .setMaxLength(100)
            .setRequired(true),
        ),
    )
    .addSubcommandGroup((grp) =>
      grp
        .setName("fact")
        .setDescription("Manage server knowledge base facts (Administrator only)")
        .addSubcommand((sub) =>
          sub
            .setName("set")
            .setDescription("Register an approved server fact or FAQ")
            .addStringOption((opt) =>
              opt.setName("key").setDescription("Fact keyword (e.g. rules, ip)").setMaxLength(32).setRequired(true),
            )
            .addStringOption((opt) =>
              opt.setName("content").setDescription("Information content").setMaxLength(1000).setRequired(true),
            ),
        )
        .addSubcommand((sub) => sub.setName("list").setDescription("List all approved server facts"))
        .addSubcommand((sub) =>
          sub
            .setName("delete")
            .setDescription("Remove an approved server fact")
            .addStringOption((opt) =>
              opt.setName("key").setDescription("Fact keyword to remove").setMaxLength(32).setRequired(true),
            ),
        ),
    )
    .addSubcommand((sub) =>
      sub.setName("settings").setDescription("Inspect active AI providers, models, and capabilities"),
    ),

  module: AI,
  permissions: PermissionLevel.MEMBER,
  cooldownMs: 3000,

  async execute(interaction: ChatInputCommandInteraction): Promise<void> {
    const guildId = interaction.guildId;
    if (!guildId) return;

    const group = interaction.options.getSubcommandGroup(false);
    const sub = interaction.options.getSubcommand();

    // ── /ai ask ─────────────────────────────────────────────
    if (!group && sub === "ask") {
      const promptRaw = interaction.options.getString("prompt", true);
      const mode = (interaction.options.getString("mode") as AskOptions["mode"]) || "normal";
      const prompt = sanitizeString(promptRaw, 1000);

      await interaction.deferReply();

      const response = await aiOrchestratorService.ask(
        guildId,
        interaction.user.id,
        interaction.user.username,
        prompt,
        { mode },
      );

      const embed = new EmbedBuilder()
        .setColor(Colors.PRIMARY)
        .setTitle(`💬 ${prompt.slice(0, 80)}${prompt.length > 80 ? "…" : ""}`)
        .setDescription(response.text)
        .setFooter({
          text: `${FOOTER_TEXT} • Provider: ${response.provider} (${response.model})`,
        })
        .setTimestamp();

      await interaction.editReply({ embeds: [embed] });
      return;
    }

    // ── /ai summarize ───────────────────────────────────────
    if (!group && sub === "summarize") {
      const limit = interaction.options.getInteger("limit") ?? 25;
      const channel = interaction.channel;

      if (!channel || !channel.isTextBased()) {
        await interaction.reply({
          embeds: [createErrorEmbed("Channel Error", "Summarization can only be performed in text channels.")],
          ephemeral: true,
        });
        return;
      }

      await interaction.deferReply();

      const messages = await (channel as TextChannel).messages.fetch({ limit });
      const formatted = messages
        .reverse()
        .filter((m) => !m.author.bot && m.content.trim().length > 0)
        .map((m) => `${m.author.username}: ${m.content.slice(0, 200)}`);

      if (formatted.length < 3) {
        await interaction.editReply({
          embeds: [
            createErrorEmbed(
              "Insufficient Discussion",
              "Not enough recent member messages found in this channel to produce a meaningful summary.",
            ),
          ],
        });
        return;
      }

      const channelName =
        "name" in channel && channel.name ? channel.name : "discussion";
      const summaryText = await aiOrchestratorService.summarize(
        guildId,
        channelName,
        formatted,
      );

      const embed = new EmbedBuilder()
        .setColor(Colors.PRIMARY)
        .setTitle(`📋 Discussion Summary — #${channelName}`)
        .setDescription(summaryText)
        .setFooter({ text: `${FOOTER_TEXT} • Analyzed ${formatted.length} messages` })
        .setTimestamp();

      await interaction.editReply({ embeds: [embed] });
      return;
    }

    // ── /ai announce ────────────────────────────────────────
    if (!group && sub === "announce") {
      const topic = interaction.options.getString("topic", true);
      const tone = interaction.options.getString("tone") || "enthusiastic";

      await interaction.deferReply();

      const draft = await aiOrchestratorService.draftAnnouncement(guildId, topic, tone);

      const embed = new EmbedBuilder()
        .setColor(Colors.ACCENT)
        .setTitle(`📢 Draft Announcement (${tone.toUpperCase()})`)
        .setDescription(draft)
        .setFooter({ text: `${FOOTER_TEXT} • You can copy and edit this draft before posting!` })
        .setTimestamp();

      await interaction.editReply({ embeds: [embed] });
      return;
    }

    // ── /ai memory ──────────────────────────────────────────
    if (!group && sub === "memory") {
      const action = interaction.options.getString("action", true);

      if (action === "clear") {
        const deleted = await memoryService.clearMemory(guildId, interaction.user.id);
        await interaction.reply({
          embeds: [
            createSuccessEmbed(
              "Conversational Memory Cleared",
              `Successfully erased **${deleted}** stored conversation interactions. Your private conversational slate is now clean.`,
            ),
          ],
          ephemeral: true,
        });
        return;
      }

      if (action === "view") {
        const history = await memoryService.getHistory(guildId, interaction.user.id, 8);
        const count = history.length;

        const embed = new EmbedBuilder()
          .setColor(Colors.PRIMARY)
          .setTitle("🧠 Your Private Conversational Memory")
          .setDescription(
            count === 0
              ? "*No conversation context stored yet. Chat with `/ai ask` to build memory!*"
              : `NEXUS AI retains up to 12 recent interactions strictly private to you in this server.\n\n` +
                  history
                    .map((m) => `**${m.role === "user" ? "You" : "NEXUS"}:** ${m.content.slice(0, 150)}…`)
                    .join("\n\n"),
          )
          .setFooter({ text: `${FOOTER_TEXT} • Run /ai memory action:clear to wipe at any time` })
          .setTimestamp();

        await interaction.reply({ embeds: [embed], ephemeral: true });
        return;
      }
    }

    // ── /ai faq ─────────────────────────────────────────────
    if (!group && sub === "faq") {
      const query = interaction.options.getString("query", true);
      const matches = await communityFactsService.findRelevantFacts(guildId, query);

      if (matches.length > 0) {
        const embed = new EmbedBuilder()
          .setColor(Colors.PRIMARY)
          .setTitle(`💡 Community Knowledge: ${query}`)
          .setDescription(matches.join("\n\n"))
          .setFooter({ text: FOOTER_TEXT })
          .setTimestamp();

        await interaction.reply({ embeds: [embed] });
        return;
      }

      // If no exact fact matches, query orchestrator for guidance
      await interaction.deferReply();
      const aiAnswer = await aiOrchestratorService.ask(
        guildId,
        interaction.user.id,
        interaction.user.username,
        `Answer this server question based on community context: ${query}`,
        { mode: "concise" },
      );

      const embed = new EmbedBuilder()
        .setColor(Colors.PRIMARY)
        .setTitle(`💡 Question: ${query}`)
        .setDescription(aiAnswer.text)
        .setFooter({ text: `${FOOTER_TEXT} • AI Knowledge Assistant` })
        .setTimestamp();

      await interaction.editReply({ embeds: [embed] });
      return;
    }

    // ── /ai fact (Group) ────────────────────────────────────
    if (group === "fact") {
      if (sub === "list") {
        const facts = await communityFactsService.getAllFacts(guildId);
        const embed = new EmbedBuilder()
          .setColor(Colors.PRIMARY)
          .setTitle(`${EMOJIS.BOOK} Approved Community Knowledge Facts`)
          .setDescription(`Stored knowledge items for **${interaction.guild?.name}**:`)
          .setFooter({ text: FOOTER_TEXT })
          .setTimestamp();

        if (facts.length === 0) {
          embed.setDescription("No community facts registered yet. Administrators can add them with `/ai fact set`.");
        } else {
          embed.addFields(
            facts.map((f) => ({
              name: `• [${f.key.toUpperCase()}]`,
              value: f.content.slice(0, 200),
              inline: false,
            })),
          );
        }

        await interaction.reply({ embeds: [embed] });
        return;
      }

      // Set & Delete require Administrator
      const member = interaction.member;
      const isAdmin =
        member && "permissions" in member && typeof member.permissions !== "string"
          ? member.permissions.has(PermissionFlagsBits.Administrator)
          : false;

      if (!isAdmin) {
        await interaction.reply({
          embeds: [createErrorEmbed("Permission Denied", "You must possess Administrator permissions to manage server facts.")],
          ephemeral: true,
        });
        return;
      }

      if (sub === "set") {
        const key = interaction.options.getString("key", true);
        const content = interaction.options.getString("content", true);

        await communityFactsService.setFact(guildId, key, content, interaction.user.id);
        await interaction.reply({
          embeds: [
            createSuccessEmbed(
              "Server Fact Registered",
              `Successfully added **[${key.toUpperCase()}]** to server knowledge!\nNEXUS AI will now automatically use this information in answers.`,
            ),
          ],
        });
        return;
      }

      if (sub === "delete") {
        const key = interaction.options.getString("key", true);
        const deleted = await communityFactsService.deleteFact(guildId, key);

        if (deleted) {
          await interaction.reply({
            embeds: [createSuccessEmbed("Fact Removed", `Removed **[${key.toUpperCase()}]** from server facts.`)],
          });
        } else {
          await interaction.reply({
            embeds: [createErrorEmbed("Not Found", `Fact **[${key.toUpperCase()}]** does not exist.`)],
            ephemeral: true,
          });
        }
        return;
      }
    }

    // ── /ai settings ────────────────────────────────────────
    if (!group && sub === "settings") {
      const activeProviders = aiOrchestratorService.getActiveProviders();

      const embed = new EmbedBuilder()
        .setColor(Colors.PRIMARY)
        .setTitle(`${EMOJIS.GEAR} NEXUS AI Brain Configuration`)
        .setDescription("Overview of active AI intelligence pipelines and multilingual models:")
        .addFields(
          {
            name: "Active Providers",
            value: activeProviders.map((p) => `🟢 \`${p}\``).join("\n") || "🟡 `fallback-rules only`",
            inline: true,
          },
          {
            name: "Supported Languages",
            value: "🇬🇧 **English**\n🇮🇳 **Telugu (తెలుగు)**",
            inline: true,
          },
          {
            name: "Cloud Architecture",
            value: "`REST API Stateless` (Optimized for 4GB HP Windows host)",
            inline: false,
          },
        )
        .setFooter({ text: FOOTER_TEXT })
        .setTimestamp();

      await interaction.reply({ embeds: [embed] });
      return;
    }
  },
};
