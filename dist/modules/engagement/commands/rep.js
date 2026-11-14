/**
 * /rep slash command.
 * Endorse a fellow community member for helpfulness, support, or positive contributions.
 */
import { SlashCommandBuilder, EmbedBuilder, } from "discord.js";
import { ENGAGEMENT } from "../../../config/features.js";
import { PermissionLevel } from "../../../types/index.js";
import { Colors, createErrorEmbed } from "../../../utils/embeds.js";
import { FOOTER_TEXT, EMOJIS } from "../../../utils/constants.js";
import { memberRepository } from "../../../database/index.js";
import { achievementService } from "../services/achievement.service.js";
import { formatDuration } from "../../../utils/helpers.js";
const REP_COOLDOWN_MS = 12 * 60 * 60 * 1000; // 12 hours
export const repCommand = {
    data: new SlashCommandBuilder()
        .setName("rep")
        .setDescription("Award a reputation endorsement to a helpful community member")
        .addUserOption((opt) => opt
        .setName("member")
        .setDescription("The user who provided helpful assistance")
        .setRequired(true))
        .addStringOption((opt) => opt
        .setName("reason")
        .setDescription("Brief note explaining why they were helpful")
        .setMaxLength(200)
        .setRequired(false)),
    module: ENGAGEMENT,
    permissions: PermissionLevel.MEMBER,
    cooldownMs: 3000,
    async execute(interaction) {
        const guildId = interaction.guildId;
        if (!guildId)
            return;
        const targetUser = interaction.options.getUser("member", true);
        const reason = interaction.options.getString("reason");
        // Self check
        if (targetUser.id === interaction.user.id) {
            await interaction.reply({
                embeds: [createErrorEmbed("Invalid Action", "You cannot award reputation points to yourself!")],
                ephemeral: true,
            });
            return;
        }
        // Bot check
        if (targetUser.bot) {
            await interaction.reply({
                embeds: [createErrorEmbed("Invalid Action", "You cannot award reputation points to bot accounts.")],
                ephemeral: true,
            });
            return;
        }
        const senderRecord = await memberRepository.findOrCreate(guildId, interaction.user.id, interaction.user.username);
        // Cooldown check on sender
        if (senderRecord.lastRepGiven) {
            const elapsed = Date.now() - senderRecord.lastRepGiven.getTime();
            if (elapsed < REP_COOLDOWN_MS) {
                const remaining = formatDuration(REP_COOLDOWN_MS - elapsed);
                await interaction.reply({
                    embeds: [
                        createErrorEmbed("Reputation Cooldown", `You have already endorsed someone recently. You can give reputation again in **${remaining}**.`),
                    ],
                    ephemeral: true,
                });
                return;
            }
        }
        const targetRecord = await memberRepository.findOrCreate(guildId, targetUser.id, targetUser.username);
        const newTargetRep = targetRecord.reputation + 1;
        const newTargetXp = targetRecord.xp + 50;
        // Check achievement badges for target
        const { newlyUnlocked, updatedBadges } = achievementService.evaluateBadges(targetRecord.badges, {
            messageCount: targetRecord.messageCount,
            level: targetRecord.level,
            dailyStreak: targetRecord.dailyStreak,
            reputation: newTargetRep,
            voiceMinutes: targetRecord.voiceMinutes,
            hasBirthday: Boolean(targetRecord.birthday),
            hasBio: Boolean(targetRecord.bio),
        });
        // Update target
        await memberRepository.update(guildId, targetUser.id, {
            reputation: newTargetRep,
            xp: newTargetXp,
            badges: JSON.stringify(updatedBadges),
        });
        // Update sender (cooldown + small bonus for being active)
        await memberRepository.update(guildId, interaction.user.id, {
            lastRepGiven: new Date(),
            xp: senderRecord.xp + 20,
        });
        const embed = new EmbedBuilder()
            .setColor(Colors.SUCCESS)
            .setTitle(`${EMOJIS.HEART} Community Endorsement Awarded!`)
            .setDescription(`<@${interaction.user.id}> endorsed <@${targetUser.id}> for being a helpful member of the community!\n\n` +
            `🤝 **New Reputation:** **+${newTargetRep}**\n` +
            `✨ **Bonus:** **+50 XP** to <@${targetUser.id}>, **+20 XP** to <@${interaction.user.id}>\n` +
            (reason ? `📝 **Reason:** *"${reason}"*` : ""))
            .setFooter({ text: FOOTER_TEXT })
            .setTimestamp();
        if (newlyUnlocked.length > 0) {
            embed.addFields({
                name: "🏆 Achievement Unlocked for Recipient!",
                value: newlyUnlocked.map((b) => `${b.emoji} **${b.name}** — *${b.description}*`).join("\n"),
                inline: false,
            });
        }
        await interaction.reply({ embeds: [embed] });
    },
};
//# sourceMappingURL=rep.js.map