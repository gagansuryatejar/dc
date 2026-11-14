/**
 * Trivia Button Interaction Event Handler for NEXUS AI.
 * Handles interactive button clicks on live trivia questions.
 */

import { Events, Interaction } from "discord.js";
import type { NexusEvent } from "../../../types/index.js";
import { AI } from "../../../config/features.js";
import { gameHostService } from "../services/game-host.service.js";
import { createSuccessEmbed, createWarningEmbed } from "../../../utils/embeds.js";

export const gameButtonsEvent: NexusEvent<Events.InteractionCreate> = {
  name: Events.InteractionCreate,
  module: AI,
  once: false,
  async execute(interaction: Interaction): Promise<void> {
    if (!interaction.isButton()) return;
    if (!interaction.customId.startsWith("trivia_")) return;

    const parts = interaction.customId.split("_");
    // trivia_<sessionId>_<index>
    if (parts.length < 3) return;

    const choiceIndex = parts[2];
    const guildId = interaction.guildId;
    const channelId = interaction.channelId;

    if (!guildId || !channelId) return;

    try {
      const result = await gameHostService.submitAnswer(
        guildId,
        channelId,
        interaction.user.id,
        interaction.user.username,
        choiceIndex,
      );

      if (!result.active) {
        await interaction.reply({
          content: "❌ This trivia session has already ended or expired.",
          ephemeral: true,
        });
        return;
      }

      if (result.correct) {
        const embed = createSuccessEmbed(
          "🎉 TRIVIA WINNER!",
          `<@${interaction.user.id}> selected the correct answer!\n\n**Answer:** \`${result.correctAnswer}\`\n**Award:** \`+${result.pointsAwarded} XP\` and \`+${Math.round(result.pointsAwarded! / 2)} Coins\`!`,
        );

        await interaction.reply({ embeds: [embed] });
      } else {
        await interaction.reply({
          embeds: [createWarningEmbed("Incorrect Choice", `<@${interaction.user.id}>, that was not the right answer!`)],
          ephemeral: true,
        });
      }
    } catch {
      await interaction.reply({
        content: "⚠️ An error occurred while evaluating your answer.",
        ephemeral: true,
      });
    }
  },
};
