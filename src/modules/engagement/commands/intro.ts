/**
 * /intro slash command.
 * Set your public bio and introduce yourself to the community.
 */

import {
  SlashCommandBuilder,
  ChatInputCommandInteraction,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
} from "discord.js";
import { ENGAGEMENT } from "../../../config/features.js";
import { PermissionLevel, type NexusCommand } from "../../../types/index.js";
import { Colors } from "../../../utils/embeds.js";
import { FOOTER_TEXT, EMOJIS } from "../../../utils/constants.js";
import { memberRepository, guildRepository } from "../../../database/index.js";
import { achievementService } from "../services/achievement.service.js";
import { sanitizeString } from "../../../security/validators.js";

export const introCommand: NexusCommand = {
  data: new SlashCommandBuilder()
    .setName("intro")
    .setDescription("Set or update your community bio and introduce yourself to the server")
    .addStringOption((opt) =>
      opt
        .setName("bio")
        .setDescription("A brief description about yourself, your interests, or games you play")
        .setMaxLength(500)
        .setRequired(true),
    )
    .addBooleanOption((opt) =>
      opt
        .setName("share")
        .setDescription("Share this introduction publicly in the welcome channel (defaults to true)")
        .setRequired(false),
    ),

  module: ENGAGEMENT,
  permissions: PermissionLevel.MEMBER,
  cooldownMs: 5000,

  async execute(interaction: ChatInputCommandInteraction): Promise<void> {
    const guildId = interaction.guildId;
    if (!guildId) return;

    const bioRaw = interaction.options.getString("bio", true);
    const shouldShare = interaction.options.getBoolean("share") ?? true;
    const bio = sanitizeString(bioRaw, 500);

    const member = await memberRepository.findOrCreate(
      guildId,
      interaction.user.id,
      interaction.user.username,
    );

    // Evaluate badges
    const { updatedBadges } = achievementService.evaluateBadges(member.badges, {
      messageCount: member.messageCount,
      level: member.level,
      dailyStreak: member.dailyStreak,
      reputation: member.reputation,
      voiceMinutes: member.voiceMinutes,
      hasBirthday: Boolean(member.birthday),
      hasBio: true,
    });

    await memberRepository.update(guildId, interaction.user.id, {
      bio,
      badges: JSON.stringify(updatedBadges),
    });

    await interaction.reply({
      content: "✅ Your community profile bio has been updated successfully!",
      ephemeral: true,
    });

    if (shouldShare) {
      const guildData = await guildRepository.findById(guildId);
      const targetChannelId = guildData?.welcomeChannel || interaction.channelId;
      const targetChannel = interaction.guild?.channels.cache.get(targetChannelId);

      if (targetChannel && targetChannel.isTextBased()) {
        const joinedTs =
          interaction.member && "joinedTimestamp" in interaction.member && interaction.member.joinedTimestamp
            ? interaction.member.joinedTimestamp
            : Date.now();

        const introEmbed = new EmbedBuilder()
          .setColor(Colors.PRIMARY)
          .setTitle(`${EMOJIS.WAVE} Community Introduction: ${interaction.user.username}`)
          .setDescription(bio)
          .setThumbnail(interaction.user.displayAvatarURL({ size: 256 }))
          .addFields({
            name: "Member Info",
            value: `👤 User: <@${interaction.user.id}>\n📅 Joined: <t:${Math.floor(joinedTs / 1000)}:R>`,
            inline: false,
          })
          .setFooter({ text: FOOTER_TEXT })
          .setTimestamp();

        const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
          new ButtonBuilder()
            .setCustomId(`welcome_wave:${interaction.user.id}`)
            .setLabel("Say Hello! 👋")
            .setStyle(ButtonStyle.Primary),
        );

        await targetChannel.send({ embeds: [introEmbed], components: [row] });
      }
    }
  },
};
