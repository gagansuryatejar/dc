/**
 * NEXUS AI — /birthday command
 * Set, view, and manage birthday with timezone support.
 */

import {
  SlashCommandBuilder,
  EmbedBuilder,
  ChatInputCommandInteraction,
} from "discord.js";
import { memberRepository } from "../../../database/index.js";
import { isValidBirthday, daysUntilBirthday, formatBirthday, isBirthdayToday } from "../services/birthday.service.js";

export const data = new SlashCommandBuilder()
  .setName("birthday")
  .setDescription("Set or view birthday")
  .addSubcommand((sub) =>
    sub.setName("set").setDescription("Set your birthday (MM-DD)")
      .addStringOption((opt) => opt.setName("date").setDescription("Birthday in MM-DD format (e.g., 05-24)").setRequired(true))
      .addStringOption((opt) => opt.setName("timezone").setDescription("Your IANA timezone (e.g., America/New_York)").setRequired(false)),
  )
  .addSubcommand((sub) =>
    sub.setName("view").setDescription("View your or another member's birthday")
      .addUserOption((opt) => opt.setName("user").setDescription("Member to view")),
  )
  .addSubcommand((sub) =>
    sub.setName("remove").setDescription("Remove your birthday"),
  );

export async function execute(interaction: ChatInputCommandInteraction): Promise<void> {
  const guildId = interaction.guildId!;
  const userId = interaction.user.id;

  // Ensure member record exists
  await memberRepository.findOrCreate({ guildId, userId, username: interaction.user.username });

  if (interaction.options.getSubcommand() === "set") {
    const date = interaction.options.getString("date", true);
    const timezone = interaction.options.getString("timezone") || "UTC";

    if (!isValidBirthday(date)) {
      await interaction.reply({ content: "Invalid date format. Use MM-DD (e.g., 05-24).", flags: 64 });
      return;
    }

    await memberRepository.update(guildId, userId, {
      birthday: date,
      timezone: timezone,
    } as any);

    const daysUntil = daysUntilBirthday(date);
    const embed = new EmbedBuilder()
      .setTitle("🎂 Birthday Set!")
      .setDescription(`Your birthday is now **${formatBirthday(date)}** (${date})`)
      .setColor(0xff69b4)
      .addFields(
        { name: "Date", value: formatBirthday(date), inline: true },
        { name: "Days Until", value: daysUntil === 0 ? "🎉 TODAY!" : `${daysUntil} day${daysUntil !== 1 ? "s" : ""}`, inline: true },
      );

    await interaction.reply({ embeds: [embed] });
    return;
  }

  if (interaction.options.getSubcommand() === "view") {
    const targetUser = interaction.options.getUser("user") || interaction.user;
    const targetMember = await memberRepository.findOrCreate({ guildId, userId: targetUser.id, username: targetUser.username });

    if (!targetMember.birthday) {
      await interaction.reply({ content: `${targetUser.username} hasn't set their birthday yet.`, flags: 64 });
      return;
    }

    const today = isBirthdayToday(targetMember.birthday);
    const daysUntil = daysUntilBirthday(targetMember.birthday);

    const embed = new EmbedBuilder()
      .setTitle(`${targetUser.username}'s Birthday`)
      .setThumbnail(targetUser.displayAvatarURL({ size: 128 }))
      .setColor(today ? 0xff69b4 : 0x5865f2)
      .addFields(
        { name: "Date", value: formatBirthday(targetMember.birthday), inline: true },
        { name: "Status", value: today ? "🎉 Happy Birthday Today!" : `${daysUntil} day${daysUntil !== 1 ? "s" : ""} until birthday`, inline: true },
      )
      .setFooter({ text: "NEXUS AI Community" });

    await interaction.reply({ embeds: [embed] });
    return;
  }

  if (interaction.options.getSubcommand() === "remove") {
    const member = await memberRepository.findByGuildAndUser(guildId, userId);
    if (!member?.birthday) {
      await interaction.reply({ content: "You don't have a birthday set.", flags: 64 });
      return;
    }

    await memberRepository.update(guildId, userId, { birthday: null });
    await interaction.reply({ content: "Your birthday has been removed.", flags: 64 });
  }
}