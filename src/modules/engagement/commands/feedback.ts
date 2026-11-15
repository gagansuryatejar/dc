/**
 * NEXUS AI — /feedback command
 * Submit feedback about the bot/community.
 */

import {
  SlashCommandBuilder,
  EmbedBuilder,
  ChatInputCommandInteraction,
} from "discord.js";

export const data = new SlashCommandBuilder()
  .setName("feedback")
  .setDescription("Submit feedback about the bot or community")
  .addStringOption((option) =>
    option.setName("type").setDescription("Feedback category").setRequired(true)
      .addChoices(
        { name: "Bug Report", value: "bug" },
        { name: "Feature Request", value: "feature" },
        { name: "General Feedback", value: "general" },
        { name: "Complaint", value: "complaint" },
        { name: "Praise", value: "praise" },
      ),
  )
  .addStringOption((option) =>
    option.setName("content").setDescription("Your feedback (max 2000 chars)").setRequired(true).setMaxLength(2000),
  );

export async function execute(interaction: ChatInputCommandInteraction): Promise<void> {
  const type = interaction.options.getString("type", true);
  // Note: content is retrieved but not used in this simple acknowledgment version

  // Store feedback in database (using suggestion table with special flag or create a simple log)
  // For now, just acknowledge and log
  const embed = new EmbedBuilder()
    .setTitle("📬 Feedback Received")
    .setDescription(`Thank you for your **${type}**!`)
    .setColor(0x5865f2)
    .addFields(
      { name: "Type", value: type.charAt(0).toUpperCase() + type.slice(1), inline: true },
      { name: "Submitted By", value: interaction.user.toString(), inline: true },
    )
    .setFooter({ text: "NEXUS AI Community" });

  await interaction.reply({ embeds: [embed], flags: 64 });
}