/**
 * /achievements slash command.
 * View unlocked badges and explore available community milestones.
 */
import { SlashCommandBuilder, EmbedBuilder, } from "discord.js";
import { ENGAGEMENT } from "../../../config/features.js";
import { PermissionLevel } from "../../../types/index.js";
import { Colors } from "../../../utils/embeds.js";
import { FOOTER_TEXT } from "../../../utils/constants.js";
import { memberRepository } from "../../../database/index.js";
import { BADGE_REGISTRY } from "../services/achievement.service.js";
export const achievementsCommand = {
    data: new SlashCommandBuilder()
        .setName("achievements")
        .setDescription("Inspect community badges and progress toward milestones")
        .addUserOption((opt) => opt
        .setName("member")
        .setDescription("The user whose achievements to view (defaults to yourself)")
        .setRequired(false)),
    module: ENGAGEMENT,
    permissions: PermissionLevel.MEMBER,
    cooldownMs: 3000,
    async execute(interaction) {
        const guildId = interaction.guildId;
        if (!guildId)
            return;
        const targetUser = interaction.options.getUser("member") || interaction.user;
        const member = await memberRepository.findOrCreate(guildId, targetUser.id, targetUser.username);
        let unlockedIds = [];
        try {
            unlockedIds = JSON.parse(member.badges || "[]");
        }
        catch {
            unlockedIds = [];
        }
        const allBadges = Object.values(BADGE_REGISTRY);
        const unlockedCount = unlockedIds.length;
        const totalCount = allBadges.length;
        const lines = allBadges.map((badge) => {
            const isUnlocked = unlockedIds.includes(badge.id);
            const icon = isUnlocked ? "🟢" : "🔒";
            const nameStr = isUnlocked ? `**${badge.emoji} ${badge.name}**` : `*${badge.emoji} ${badge.name}*`;
            return `${icon} ${nameStr}\n*${badge.description}*`;
        });
        const embed = new EmbedBuilder()
            .setColor(Colors.PRIMARY)
            .setTitle(`🏆 Community Achievements — ${targetUser.username}`)
            .setDescription(`Milestone Progress: **${unlockedCount} / ${totalCount}** (${Math.round((unlockedCount / totalCount) * 100)}%)\n\n` +
            lines.join("\n\n"))
            .setThumbnail(targetUser.displayAvatarURL({ size: 256 }))
            .setFooter({ text: FOOTER_TEXT })
            .setTimestamp();
        await interaction.reply({ embeds: [embed] });
    },
};
//# sourceMappingURL=achievements.js.map