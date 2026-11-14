/**
 * Poll live voting button interaction handlers.
 */

import { type ButtonInteraction, EmbedBuilder } from "discord.js";
import { ENGAGEMENT } from "../../../config/features.js";
import type { ButtonHandler } from "../../../types/index.js";
import { pollRepository } from "../repositories/poll.repository.js";
import { interactionHandler } from "../../../handlers/interactionHandler.js";

const OPTION_EMOJIS = ["1️⃣", "2️⃣", "3️⃣", "4️⃣"];

function renderPollBar(percent: number, length = 10): string {
  const safePercent = Math.max(0, Math.min(100, percent));
  const filled = Math.round((safePercent / 100) * length);
  const empty = Math.max(0, length - filled);
  return `\`[${"█".repeat(filled)}${"░".repeat(empty)}]\` **${safePercent}%**`;
}

export const pollVoteHandler: ButtonHandler = {
  customId: "poll_vote",
  isPrefix: true,
  module: ENGAGEMENT,

  async execute(interaction: ButtonInteraction): Promise<void> {
    const parts = interaction.customId.split(":");
    const pollId = parts[1];
    const optIdx = Number(parts[2]);

    if (!pollId || isNaN(optIdx)) return;

    try {
      const { poll, tally, totalVotes } = await pollRepository.recordVote(
        pollId,
        interaction.user.id,
        optIdx,
      );

      const options: string[] = JSON.parse(poll.options || "[]");

      const newDescription = options
        .map((opt, idx) => {
          const votes = tally[idx] || 0;
          const pct = totalVotes > 0 ? Math.round((votes / totalVotes) * 100) : 0;
          return `${OPTION_EMOJIS[idx]} **${opt}**\n${renderPollBar(pct)} (${votes} vote${votes === 1 ? "" : "s"})`;
        })
        .join("\n\n");

      const originalEmbed = interaction.message.embeds[0];
      if (!originalEmbed) return;

      const updatedEmbed = EmbedBuilder.from(originalEmbed)
        .setDescription(newDescription)
        .setFields({
          name: "Poll Metadata",
          value: `👤 Created by <@${poll.creatorId}> • Total Votes: **${totalVotes}**`,
        });

      await interaction.update({
        embeds: [updatedEmbed],
      });
    } catch {
      await interaction.reply({
        content: "❌ Unable to register vote. The poll may be closed or deleted.",
        ephemeral: true,
      });
    }
  },
};

export function registerPollInteractions(): void {
  interactionHandler.registerButton(pollVoteHandler);
}
