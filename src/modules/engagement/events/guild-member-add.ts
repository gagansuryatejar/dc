/**
 * GuildMemberAdd event handler.
 * Personalized onboarding card with interactive welcome buttons and member registration.
 */

import {
  Events,
  type GuildMember,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
} from "discord.js";
import { ENGAGEMENT } from "../../../config/features.js";
import type { NexusEvent } from "../../../types/index.js";
import { createModuleLogger } from "../../../utils/logger.js";
import { guildRepository, memberRepository } from "../../../database/index.js";
import { Colors } from "../../../utils/embeds.js";
import { FOOTER_TEXT } from "../../../utils/constants.js";

const logger = createModuleLogger("event:guildMemberAdd");

export const guildMemberAddEvent: NexusEvent<Events.GuildMemberAdd> = {
  name: Events.GuildMemberAdd,
  once: false,
  module: ENGAGEMENT,

  async execute(member: GuildMember): Promise<void> {
    if (member.user.bot) return;

    logger.info(`New member joined guild ${member.guild.id}: ${member.user.tag} (${member.id})`);

    try {
      // 1. Persist or initialize member record
      await memberRepository.findOrCreate(
        member.guild.id,
        member.id,
        member.user.username,
      );

      // 2. Fetch guild settings to locate designated welcome channel
      const guildData = await guildRepository.findById(member.guild.id);
      if (!guildData?.welcomeChannel) return;

      const welcomeChannel = member.guild.channels.cache.get(guildData.welcomeChannel);
      if (!welcomeChannel || !welcomeChannel.isTextBased()) return;

      const memberCount = member.guild.memberCount;

      const embed = new EmbedBuilder()
        .setColor(Colors.PRIMARY)
        .setTitle(`👋 Welcome to ${member.guild.name}, ${member.displayName}!`)
        .setDescription(
          `We are delighted to have you join our community, <@${member.id}>!\n\n` +
            `You are community member **#${memberCount}**! 🎉\n` +
            `Feel free to explore our channels, join ongoing voice rooms, and introduce yourself.`,
        )
        .setThumbnail(member.user.displayAvatarURL({ size: 256 }))
        .addFields(
          {
            name: "Getting Started",
            value:
              "• Run `/profile` to view your stats and badges.\n" +
              "• Run `/daily` each day to earn bonus XP and coins.\n" +
              "• Run `/intro` to set your community bio.",
            inline: false,
          },
        )
        .setFooter({ text: FOOTER_TEXT })
        .setTimestamp();

      const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
        new ButtonBuilder()
          .setCustomId(`welcome_wave:${member.id}`)
          .setLabel("Say Hello! 👋")
          .setStyle(ButtonStyle.Primary),
        new ButtonBuilder()
          .setCustomId(`welcome_intro:${member.id}`)
          .setLabel("Introduce Yourself ✨")
          .setStyle(ButtonStyle.Secondary),
      );

      await welcomeChannel.send({
        content: `🎉 Welcome <@${member.id}> to **${member.guild.name}**!`,
        embeds: [embed],
        components: [row],
      });
    } catch (error) {
      logger.error({ error, memberId: member.id, guildId: member.guild.id }, "Error handling GuildMemberAdd event");
    }
  },
};
