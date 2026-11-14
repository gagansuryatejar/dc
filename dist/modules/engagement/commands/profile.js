/**
 * /profile slash command.
 * Displays a member's community identity card, progression, stats, badges, and bio.
 */
import { SlashCommandBuilder, EmbedBuilder, } from "discord.js";
import { ENGAGEMENT } from "../../../config/features.js";
import { PermissionLevel } from "../../../types/index.js";
import { Colors } from "../../../utils/embeds.js";
import { FOOTER_TEXT, EMOJIS } from "../../../utils/constants.js";
import { memberRepository, prisma } from "../../../database/index.js";
import { levelService } from "../services/level.service.js";
import { achievementService } from "../services/achievement.service.js";
import { formatNumber } from "../../../utils/helpers.js";
export const profileCommand = {
    data: new SlashCommandBuilder()
        .setName("profile")
        .setDescription("Inspect your community profile, level, achievements, and statistics")
        .addUserOption((opt) => opt
        .setName("member")
        .setDescription("The user whose profile you want to inspect (defaults to yourself)")
        .setRequired(false)),
    module: ENGAGEMENT,
    permissions: PermissionLevel.MEMBER,
    cooldownMs: 3000,
    async execute(interaction) {
        const guildId = interaction.guildId;
        if (!guildId)
            return;
        const targetUser = interaction.options.getUser("member") || interaction.user;
        const targetMember = await interaction.guild?.members.fetch(targetUser.id).catch(() => null);
        const record = await memberRepository.findOrCreate(guildId, targetUser.id, targetUser.username);
        const progress = levelService.calculateProgress(record.xp);
        const progressBar = levelService.renderProgressBar(progress.progressPercent, 10);
        const badgeDisplay = achievementService.formatBadgeDisplay(record.badges);
        // Calculate server rank based on XP
        const rankCount = await prisma.guildMember.count({
            where: {
                guildId,
                xp: { gt: record.xp },
            },
        });
        const rank = rankCount + 1;
        const voiceHours = (record.voiceMinutes / 60).toFixed(1);
        const embed = new EmbedBuilder()
            .setColor(Colors.PRIMARY)
            .setTitle(`📜 Community Profile — ${targetMember?.displayName || targetUser.username}`)
            .setDescription(record.bio || "*No personal bio set. Use `/intro` to set your community intro!*")
            .setThumbnail(targetUser.displayAvatarURL({ size: 256 }))
            .addFields({
            name: "Level & Progression",
            value: `**Level ${progress.level}** (Rank #${rank})\n` +
                `XP: \`${formatNumber(progress.currentLevelXp)} / ${formatNumber(progress.xpNeededForNextLevel)}\` (${formatNumber(record.xp)} Total)\n` +
                `${progressBar}`,
            inline: false,
        }, {
            name: `${EMOJIS.BOLT} Engagement Stats`,
            value: `💬 Messages: **${formatNumber(record.messageCount)}**\n` +
                `🎙️ Voice Time: **${voiceHours}h** (${formatNumber(record.voiceMinutes)}m)\n` +
                `🔥 Daily Streak: **${record.dailyStreak} days**`,
            inline: true,
        }, {
            name: `${EMOJIS.STAR} Social Standing`,
            value: `🤝 Reputation: **+${formatNumber(record.reputation)}**\n` +
                `🪙 Virtual Coins: **${formatNumber(record.coins)}**\n` +
                `🎂 Birthday: **${record.birthday || "Not set"}**`,
            inline: true,
        }, {
            name: `🏆 Badges & Achievements`,
            value: badgeDisplay,
            inline: false,
        })
            .setFooter({ text: FOOTER_TEXT })
            .setTimestamp();
        await interaction.reply({ embeds: [embed] });
    },
};
//# sourceMappingURL=profile.js.map