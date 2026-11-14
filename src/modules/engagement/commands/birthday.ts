/**
 * /birthday slash command group.
 * Allows members to register their birthday and inspect upcoming community celebrations.
 */

import {
  SlashCommandBuilder,
  ChatInputCommandInteraction,
  EmbedBuilder,
} from "discord.js";
import { ENGAGEMENT } from "../../../config/features.js";
import { PermissionLevel, type NexusCommand } from "../../../types/index.js";
import { Colors, createErrorEmbed, createSuccessEmbed } from "../../../utils/embeds.js";
import { FOOTER_TEXT, EMOJIS } from "../../../utils/constants.js";
import { memberRepository, prisma } from "../../../database/index.js";
import { birthdayService } from "../services/birthday.service.js";
import { achievementService } from "../services/achievement.service.js";

export const birthdayCommand: NexusCommand = {
  data: new SlashCommandBuilder()
    .setName("birthday")
    .setDescription("Register or view community birthdays and celebrations")
    .addSubcommand((sub) =>
      sub
        .setName("set")
        .setDescription("Register your birthday with NEXUS AI (Format: MM-DD)")
        .addStringOption((opt) =>
          opt
            .setName("date")
            .setDescription("Your birthday in MM-DD format (e.g. 05-24 for May 24th)")
            .setMinLength(5)
            .setMaxLength(5)
            .setRequired(true),
        ),
    )
    .addSubcommand((sub) =>
      sub
        .setName("check")
        .setDescription("Inspect a member's registered birthday")
        .addUserOption((opt) =>
          opt
            .setName("member")
            .setDescription("The user whose birthday you want to inspect (defaults to yourself)")
            .setRequired(false),
        ),
    )
    .addSubcommand((sub) =>
      sub.setName("list").setDescription("View upcoming birthdays in this server"),
    ),

  module: ENGAGEMENT,
  permissions: PermissionLevel.MEMBER,
  cooldownMs: 3000,

  async execute(interaction: ChatInputCommandInteraction): Promise<void> {
    const guildId = interaction.guildId;
    if (!guildId) return;

    const sub = interaction.options.getSubcommand();

    if (sub === "set") {
      const dateStr = interaction.options.getString("date", true).trim();
      if (!birthdayService.isValidBirthday(dateStr)) {
        await interaction.reply({
          embeds: [
            createErrorEmbed(
              "Invalid Date Format",
              `"${dateStr}" is not a valid date. Please use **MM-DD** format with leading zeroes (e.g. \`01-15\` for Jan 15, \`12-04\` for Dec 4).`,
            ),
          ],
          ephemeral: true,
        });
        return;
      }

      const member = await memberRepository.findOrCreate(
        guildId,
        interaction.user.id,
        interaction.user.username,
      );

      // Check achievement badges
      const { updatedBadges } = achievementService.evaluateBadges(member.badges, {
        messageCount: member.messageCount,
        level: member.level,
        dailyStreak: member.dailyStreak,
        reputation: member.reputation,
        voiceMinutes: member.voiceMinutes,
        hasBirthday: true,
        hasBio: Boolean(member.bio),
      });

      await memberRepository.update(guildId, interaction.user.id, {
        birthday: dateStr,
        badges: JSON.stringify(updatedBadges),
      });

      const [m, d] = dateStr.split("-").map(Number);
      const monthNames = [
        "January", "February", "March", "April", "May", "June",
        "July", "August", "September", "October", "November", "December",
      ];
      const prettyDate = `${monthNames[(m ?? 1) - 1]} ${d}`;

      await interaction.reply({
        embeds: [
          createSuccessEmbed(
            "Birthday Registered",
            `Your birthday has been registered as **${prettyDate}** (\`${dateStr}\`)! 🎂\n` +
              `NEXUS AI will celebrate your special day with the community and award you a birthday bonus!`,
          ),
        ],
        ephemeral: true,
      });
      return;
    }

    if (sub === "check") {
      const targetUser = interaction.options.getUser("member") || interaction.user;
      const member = await memberRepository.findByGuildAndUser(guildId, targetUser.id);

      if (!member?.birthday) {
        await interaction.reply({
          embeds: [
            createErrorEmbed(
              "No Birthday Set",
              `<@${targetUser.id}> has not registered their birthday yet. They can set it using \`/birthday set <MM-DD>\`.`,
            ),
          ],
          ephemeral: true,
        });
        return;
      }

      const [m, d] = member.birthday.split("-").map(Number);
      const monthNames = [
        "January", "February", "March", "April", "May", "June",
        "July", "August", "September", "October", "November", "December",
      ];
      const prettyDate = `${monthNames[(m ?? 1) - 1]} ${d}`;

      const embed = new EmbedBuilder()
        .setColor(Colors.PRIMARY)
        .setTitle(`🎂 Birthday Registry — ${targetUser.username}`)
        .setDescription(`<@${targetUser.id}>'s birthday is **${prettyDate}** (\`${member.birthday}\`).`)
        .setFooter({ text: FOOTER_TEXT })
        .setTimestamp();

      await interaction.reply({ embeds: [embed] });
      return;
    }

    if (sub === "list") {
      const membersWithBirthdays = await prisma.guildMember.findMany({
        where: {
          guildId,
          birthday: { not: null },
        },
        orderBy: { birthday: "asc" },
        take: 20,
      });

      const embed = new EmbedBuilder()
        .setColor(Colors.PRIMARY)
        .setTitle(`${EMOJIS.STAR} Community Birthdays`)
        .setDescription(`Registered celebrations in **${interaction.guild?.name}**:`)
        .setFooter({ text: FOOTER_TEXT })
        .setTimestamp();

      if (membersWithBirthdays.length === 0) {
        embed.setDescription("No members have registered their birthdays yet. Be the first with `/birthday set`!");
      } else {
        const lines = membersWithBirthdays.map((m) => `• <@${m.userId}> — \`${m.birthday}\``);
        embed.addFields({ name: "Celebrations", value: lines.join("\n") });
      }

      await interaction.reply({ embeds: [embed] });
      return;
    }
  },
};
