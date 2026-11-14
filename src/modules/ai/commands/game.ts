/**
 * Interactive Game Host Slash Command for NEXUS AI.
 * Hosts live AI trivia challenges, riddles, and rewards winners with XP/Coins.
 */

import {
  SlashCommandBuilder,
  ChatInputCommandInteraction,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
} from "discord.js";
import { type NexusCommand, PermissionLevel } from "../../../types/index.js";
import { AI } from "../../../config/features.js";
import { gameHostService } from "../services/game-host.service.js";
import {
  createBaseEmbed,
  createSuccessEmbed,
  createErrorEmbed,
  createWarningEmbed,
  Colors,
} from "../../../utils/embeds.js";

export const gameCommand: NexusCommand = {
  module: AI,
  permissions: PermissionLevel.MEMBER,
  data: new SlashCommandBuilder()
    .setName("game")
    .setDescription("Interactive AI games, trivia challenges, and riddles")
    .addSubcommand((sub) =>
      sub
        .setName("trivia")
        .setDescription("Start a live AI Trivia challenge in the channel")
        .addStringOption((opt) =>
          opt
            .setName("category")
            .setDescription("Trivia category")
            .setRequired(false)
            .addChoices(
              { name: "Tech & Gaming", value: "Tech & Gaming" },
              { name: "Science & Nature", value: "Science & Nature" },
              { name: "Anime & Pop Culture", value: "Anime & Pop Culture" },
              { name: "Discord & NEXUS AI", value: "Discord & NEXUS AI" },
            ),
        )
        .addStringOption((opt) =>
          opt
            .setName("difficulty")
            .setDescription("Question difficulty")
            .setRequired(false)
            .addChoices(
              { name: "Easy (25 XP)", value: "easy" },
              { name: "Medium (50 XP)", value: "medium" },
              { name: "Hard (100 XP)", value: "hard" },
            ),
        ),
    )
    .addSubcommand((sub) =>
      sub
        .setName("riddle")
        .setDescription("Challenge the channel with an AI riddle")
        .addStringOption((opt) =>
          opt
            .setName("difficulty")
            .setDescription("Riddle difficulty")
            .setRequired(false)
            .addChoices(
              { name: "Easy (50 XP)", value: "easy" },
              { name: "Medium (75 XP)", value: "medium" },
            ),
        ),
    )
    .addSubcommand((sub) =>
      sub
        .setName("answer")
        .setDescription("Submit your answer to the active game or riddle")
        .addStringOption((opt) =>
          opt.setName("text").setDescription("Your answer").setRequired(true),
        ),
    )
    .addSubcommand((sub) =>
      sub.setName("leaderboard").setDescription("View the server trivia champions leaderboard"),
    ) as SlashCommandBuilder,

  async execute(interaction: ChatInputCommandInteraction): Promise<void> {
    const guildId = interaction.guildId;
    const channelId = interaction.channelId;

    if (!guildId || !channelId) {
      await interaction.reply({
        embeds: [createErrorEmbed("Guild Only", "This command can only be used in a Discord server channel.")],
        ephemeral: true,
      });
      return;
    }

    const sub = interaction.options.getSubcommand();

    // ── Subcommand: trivia ──────────────────────────────────
    if (sub === "trivia") {
      await interaction.deferReply();
      const category = interaction.options.getString("category") || "Tech & Gaming";
      const difficulty = (interaction.options.getString("difficulty") as any) || "medium";

      try {
        const { session, trivia } = await gameHostService.startTriviaSession(
          guildId,
          channelId,
          category,
          difficulty,
        );

        const optionsText = trivia.options
          .map((opt, i) => `**[${["A", "B", "C", "D"][i]}]** ${opt}`)
          .join("\n");

        const embed = createBaseEmbed()
          .setColor(Colors.PRIMARY)
          .setTitle(`🧠 NEXUS AI Trivia Challenge (${trivia.difficulty.toUpperCase()})`)
          .setDescription(`**Category:** \`${trivia.category}\`\n**Points Awarded:** \`+${trivia.pointsAwarded} XP & Coins\`\n\n### ${trivia.question}\n\n${optionsText}\n\n_Click a button below or type \`/game answer <letter/option>\` within 60 seconds!_`)
          .setFooter({ text: "Session ID: " + session.id });

        // Action row with 4 buttons
        const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
          new ButtonBuilder()
            .setCustomId(`trivia_${session.id}_0`)
            .setLabel("A")
            .setStyle(ButtonStyle.Primary),
          new ButtonBuilder()
            .setCustomId(`trivia_${session.id}_1`)
            .setLabel("B")
            .setStyle(ButtonStyle.Primary),
          new ButtonBuilder()
            .setCustomId(`trivia_${session.id}_2`)
            .setLabel("C")
            .setStyle(ButtonStyle.Primary),
          new ButtonBuilder()
            .setCustomId(`trivia_${session.id}_3`)
            .setLabel("D")
            .setStyle(ButtonStyle.Primary),
        );

        await interaction.editReply({ embeds: [embed], components: [row] });
      } catch (error) {
        await interaction.editReply({
          embeds: [createErrorEmbed("Error", "Could not start trivia session.")],
        });
      }
      return;
    }

    // ── Subcommand: riddle ──────────────────────────────────
    if (sub === "riddle") {
      await interaction.deferReply();
      const difficulty = (interaction.options.getString("difficulty") as any) || "medium";

      try {
        const { session, riddle } = await gameHostService.startRiddleSession(
          guildId,
          channelId,
          difficulty,
        );

        const embed = createBaseEmbed()
          .setColor(Colors.ACCENT)
          .setTitle("🧙‍♂️ NEXUS Riddle Master")
          .setDescription(`**Riddle:**\n> *" ${riddle.riddle} "*\n\n**Reward:** \`+${riddle.pointsAwarded} XP & Coins\`\n\n_Answer using \`/game answer <your answer>\` within 2 minutes!_`)
          .setFooter({ text: "Session ID: " + session.id });

        await interaction.editReply({ embeds: [embed] });
      } catch (error) {
        await interaction.editReply({
          embeds: [createErrorEmbed("Error", "Could not launch riddle.")],
        });
      }
      return;
    }

    // ── Subcommand: answer ──────────────────────────────────
    if (sub === "answer") {
      await interaction.deferReply();
      const answer = interaction.options.getString("text", true);

      try {
        const result = await gameHostService.submitAnswer(
          guildId,
          channelId,
          interaction.user.id,
          interaction.user.username,
          answer,
        );

        if (!result.active) {
          await interaction.editReply({
            embeds: [createErrorEmbed("No Active Challenge", result.reason || "There is no ongoing game in this channel.")],
          });
          return;
        }

        if (result.correct) {
          const embed = createSuccessEmbed(
            "🎉 CORRECT ANSWER! WINNER!",
            `<@${interaction.user.id}> got it right!\n\n**Answer:** \`${result.correctAnswer}\`\n**Award:** \`+${result.pointsAwarded} XP\` and \`+${Math.round(result.pointsAwarded! / 2)} Coins\` added to profile!`,
          );
          await interaction.editReply({ embeds: [embed] });
        } else {
          let desc = `Sorry <@${interaction.user.id}>, \`${answer}\` is incorrect! Try again!`;
          if (result.hint) {
            desc += `\n\n💡 **Hint:** _${result.hint}_`;
          }
          await interaction.editReply({
            embeds: [createWarningEmbed("Incorrect Answer", desc)],
          });
        }
      } catch (error) {
        await interaction.editReply({
          embeds: [createErrorEmbed("Error", "Failed to evaluate answer submission.")],
        });
      }
      return;
    }

    // ── Subcommand: leaderboard ─────────────────────────────
    if (sub === "leaderboard") {
      await interaction.deferReply();

      try {
        const leaderboard = await gameHostService.getGameLeaderboard(guildId, 10);
        if (leaderboard.length === 0) {
          await interaction.editReply({
            embeds: [createErrorEmbed("No Games Won Yet", "Start a game with `/game trivia` to get on the leaderboard!")],
          });
          return;
        }

        const lines = leaderboard.map(
          (entry, i) =>
            `**#${i + 1}** <@${entry.winnerId}> — **${entry._count._all}** wins (Total: **${entry._sum.pointsAwarded || 0}** pts)`,
        );

        const embed = createBaseEmbed()
          .setColor(Colors.PRIMARY)
          .setTitle("🏆 NEXUS AI Trivia & Game Champions")
          .setDescription(lines.join("\n"));

        await interaction.editReply({ embeds: [embed] });
      } catch (error) {
        await interaction.editReply({
          embeds: [createErrorEmbed("Error", "Could not load game leaderboard.")],
        });
      }
      return;
    }
  },
};
