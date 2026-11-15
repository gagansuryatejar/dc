/**
 * NEXUS AI — /intro command
 * Set and view member introduction/bio.
 */

import {
  SlashCommandBuilder,
  EmbedBuilder,
  ChatInputCommandInteraction,
} from "discord.js";
import { memberRepository } from "../../../database/index.js";
import { FOOTER_TEXT } from "../../../utils/constants.js";

export const data = new SlashCommandBuilder()
  .setName("intro")
  .setDescription("Set or view member introduction")
  .addSubcommand((sub) =>
    sub.setName("set").setDescription("Set your introduction/bio")
      .addStringOption((opt) => opt.setName("bio").setDescription("Your bio (max 500 chars)").setRequired(true).setMaxLength(500)),
  )
  .addSubcommand((sub) =>
    sub.setName("view").setDescription("View your or another member's intro")
      .addUserOption((opt) => opt.setName("user").setDescription("Member to view")),
  )
  .addSubcommand((sub) =>
    sub.setName("remove").setDescription("Remove your introduction"),
  );

export async function execute(interaction: ChatInputCommandInteraction): Promise<void> {
  const guildId = interaction.guildId!;
  const userId = interaction.user.id;
  const subcommand = interaction.options.getSubcommand();

  const member = await memberRepository.findOrCreate({ guildId, userId, username: interaction.user.username });

  if (subcommand === "set") {
    const bio = interaction.options.getString("bio", true);

    await memberRepository.update(guildId, userId, { bio });

    const embed = new EmbedBuilder()
      .setTitle("📝 Introduction Updated!")
      .setDescription(bio)
      .setColor(0x5865f2)
      .setFooter({ text: FOOTER_TEXT });

    await interaction.reply({ embeds: [embed] });
    return;
  }

  if (subcommand === "view") {
    const targetUser = interaction.options.getUser("user") || interaction.user;
    const targetMember = await memberRepository.findOrCreate({ guildId, userId: targetUser.id, username: targetUser.username });

    if (!targetMember.bio) {
      await interaction.reply({ content: `${targetUser.username} hasn't set an introduction yet.`, flags: 64 });
      return;
    }

    const embed = new EmbedBuilder()
      .setTitle(`${targetUser.username}'s Introduction`)
      .setThumbnail(targetUser.displayAvatarURL({ size: 128 }))
      .setDescription(targetMember.bio)
      .setColor(0x5865f2)
      .setFooter({ text: FOOTER_TEXT });

    await interaction.reply({ embeds: [embed] });
    return;
  }

  if (subcommand === "remove") {
    if (!member.bio) {
      await interaction.reply({ content: "You don't have an introduction set.", flags: 64 });
      return;
    }

    await memberRepository.update(guildId, userId, { bio: null });
    await interaction.reply({ content: "Your introduction has been removed.", flags: 64 });
  }
}