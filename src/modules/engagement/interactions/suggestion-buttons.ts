/**
 * Suggestion vote button interaction handlers.
 */

import {
  type ButtonInteraction,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
} from "discord.js";
import { ENGAGEMENT } from "../../../config/features.js";
import type { ButtonHandler } from "../../../types/index.js";
import { suggestionRepository } from "../repositories/suggestion.repository.js";
import { interactionHandler } from "../../../handlers/interactionHandler.js";

export const suggestionVoteHandler: ButtonHandler = {
  customId: "suggest_",
  isPrefix: true,
  module: ENGAGEMENT,

  async execute(interaction: ButtonInteraction): Promise<void> {
    const [action, suggestionId] = interaction.customId.split(":");
    if (!suggestionId) return;

    const voteType = action === "suggest_upvote" ? "upvote" : "downvote";

    try {
      const { suggestion, upvoteCount, downvoteCount } = await suggestionRepository.toggleVote(
        suggestionId,
        interaction.user.id,
        voteType,
      );

      // Rebuild the updated message embed and button row
      const originalEmbed = interaction.message.embeds[0];
      if (!originalEmbed) return;

      const updatedEmbed = EmbedBuilder.from(originalEmbed);
      updatedEmbed.spliceFields(2, 1, {
        name: "Votes",
        value: `👍 **${upvoteCount}** | 👎 **${downvoteCount}**`,
        inline: true,
      });

      const updatedRow = new ActionRowBuilder<ButtonBuilder>().addComponents(
        new ButtonBuilder()
          .setCustomId(`suggest_upvote:${suggestion.id}`)
          .setLabel(`Upvote (${upvoteCount})`)
          .setEmoji("👍")
          .setStyle(ButtonStyle.Success),
        new ButtonBuilder()
          .setCustomId(`suggest_downvote:${suggestion.id}`)
          .setLabel(`Downvote (${downvoteCount})`)
          .setEmoji("👎")
          .setStyle(ButtonStyle.Secondary),
      );

      await interaction.update({
        embeds: [updatedEmbed],
        components: [updatedRow],
      });
    } catch {
      await interaction.reply({
        content: "❌ Unable to record vote. This suggestion may no longer be active.",
        ephemeral: true,
      });
    }
  },
};

export function registerSuggestionInteractions(): void {
  interactionHandler.registerButton(suggestionVoteHandler);
}
