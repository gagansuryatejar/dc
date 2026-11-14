/**
 * /heart slash command group for NEXUS AI.
 * Personal voice companion profiles, milestone achievements, reward shop,
 * AI personality settings, privacy controls, and companion leaderboards.
 */
import { SlashCommandBuilder, EmbedBuilder, } from "discord.js";
import { VOICE } from "../../../config/features.js";
import { PermissionLevel } from "../../../types/index.js";
import { Colors, createErrorEmbed, createSuccessEmbed } from "../../../utils/embeds.js";
import { FOOTER_TEXT } from "../../../utils/constants.js";
import { heartTrackerService } from "../services/heart-tracker.service.js";
import { heartConfigService } from "../services/heart-config.service.js";
import { heartShopService } from "../services/heart-shop.service.js";
import { memberRepository, prisma } from "../../../database/index.js";
import { formatNumber } from "../../../utils/helpers.js";
function renderProgressBar(percent, length = 10) {
    const filled = Math.round((percent / 100) * length);
    const empty = length - filled;
    return `[${"█".repeat(Math.max(0, filled))}${"░".repeat(Math.max(0, empty))}] ${percent}%`;
}
export const heartCommand = {
    data: new SlashCommandBuilder()
        .setName("heart")
        .setDescription("NEXUS Voice Companion — profile, achievements, rewards, settings, and privacy")
        .addSubcommand((sub) => sub
        .setName("profile")
        .setDescription("View your Voice Companion stats, title, coins, and active session")
        .addUserOption((opt) => opt.setName("user").setDescription("Target member (defaults to yourself)").setRequired(false)))
        .addSubcommand((sub) => sub
        .setName("achievements")
        .setDescription("Inspect your voice duration milestones and reward progress")
        .addUserOption((opt) => opt.setName("user").setDescription("Target member (defaults to yourself)").setRequired(false)))
        .addSubcommand((sub) => sub
        .setName("rewards")
        .setDescription("Browse the Heart Reward Shop and redeem coins for titles, badges, and cosmetics")
        .addStringOption((opt) => opt
        .setName("action")
        .setDescription("Browse catalog or buy an item")
        .setRequired(true)
        .addChoices({ name: "Browse Catalog", value: "browse" }, { name: "Buy Item", value: "buy" }))
        .addStringOption((opt) => opt
        .setName("item_id")
        .setDescription("Item ID to purchase (e.g. title_voice_royalty, deco_cherry_blossom)")
        .setRequired(false)))
        .addSubcommand((sub) => sub
        .setName("settings")
        .setDescription("Customize your AI companion personality and interaction language")
        .addStringOption((opt) => opt
        .setName("personality")
        .setDescription("Your preferred companion interaction style")
        .setRequired(false)
        .addChoices({ name: "❤️ Sweet Friend (Kind & Caring)", value: "sweet" }, { name: "😂 Funny Friend (Jokes & Playful)", value: "funny" }, { name: "🎮 Gaming Buddy (Hype & Gamer Vibes)", value: "gaming" }, { name: "👑 Royal Assistant (Polite & Regal)", value: "royal" }, { name: "🌸 Cute Companion (Cheerful & Adorable)", value: "cute" }))
        .addStringOption((opt) => opt
        .setName("language")
        .setDescription("Preferred greeting & celebration language")
        .setRequired(false)
        .addChoices({ name: "English", value: "en" }, { name: "Telugu (తెలుగు)", value: "te" }, { name: "Telugu-English Mixed (Tenglish)", value: "mixed" }))
        .addBooleanOption((opt) => opt.setName("greetings").setDescription("Enable or disable personalized greetings").setRequired(false)))
        .addSubcommand((sub) => sub
        .setName("privacy")
        .setDescription("Manage your voice privacy preferences, consent, or data erasure")
        .addStringOption((opt) => opt
        .setName("consent")
        .setDescription("Configure voice intelligence participation consent")
        .setRequired(false)
        .addChoices({ name: "Opt-In (Allow voice presence analysis & awards)", value: "opt-in" }, { name: "Opt-Out (Disable all voice analysis)", value: "opt-out" }))
        .addBooleanOption((opt) => opt
        .setName("delete_data")
        .setDescription("Delete all your recorded voice participation data and history")
        .setRequired(false)))
        .addSubcommand((sub) => sub
        .setName("notifications")
        .setDescription("Configure appreciation notification pings")
        .addBooleanOption((opt) => opt
        .setName("pings")
        .setDescription("Whether NEXUS mentions you when you hit a milestone")
        .setRequired(true)))
        .addSubcommand((sub) => sub
        .setName("leaderboard")
        .setDescription("View top voice community members and duration champions")),
    module: VOICE,
    permissions: PermissionLevel.MEMBER,
    cooldownMs: 3000,
    async execute(interaction) {
        const guildId = interaction.guildId;
        if (!guildId || !interaction.guild)
            return;
        const sub = interaction.options.getSubcommand();
        // ── 1. PROFILE ──────────────────────────────────────────
        if (sub === "profile") {
            const targetUser = interaction.options.getUser("user") || interaction.user;
            const stats = await heartTrackerService.getMemberHeartStats(guildId, targetUser.id, targetUser.username);
            const userPrefs = await heartConfigService.getUserPreferences(guildId, targetUser.id);
            const totalHours = (stats.totalVoiceMinutes / 60).toFixed(1);
            const activeText = stats.isCurrentlyInVoice
                ? `🟢 **Currently in Voice:** ${stats.activeSessionMinutes}m elapsed`
                : "⚪ *Currently offline / not in voice*";
            const embed = new EmbedBuilder()
                .setColor(Colors.PRIMARY)
                .setTitle(`❤️ Voice Companion Profile — ${stats.username}`)
                .setDescription(`${userPrefs.activeTitle ? `### 🏷️ Title: *${userPrefs.activeTitle}*\n` : ""}` +
                `${activeText}\n\n` +
                `**Companion Personality:** \`${stats.personality.toUpperCase()}\`\n` +
                `**Total Voice Airtime:** **${totalHours} Hours** (${formatNumber(stats.totalVoiceMinutes)} mins)\n` +
                `**Virtual Coins:** 🪙 **${formatNumber(stats.coins)} Coins**\n` +
                `**Milestones Unlocked:** 🏆 **${stats.claimedMilestonesCount} / ${stats.totalMilestonesCount}**\n` +
                `${userPrefs.decorations.length > 0 ? `**Decorations:** ${userPrefs.decorations.join(" ")}\n` : ""}`)
                .setThumbnail(targetUser.displayAvatarURL({ size: 256 }))
                .setFooter({ text: FOOTER_TEXT })
                .setTimestamp();
            await interaction.reply({ embeds: [embed] });
            return;
        }
        // ── 2. ACHIEVEMENTS ─────────────────────────────────────
        if (sub === "achievements") {
            const targetUser = interaction.options.getUser("user") || interaction.user;
            const stats = await heartTrackerService.getMemberHeartStats(guildId, targetUser.id, targetUser.username);
            const embed = new EmbedBuilder()
                .setColor(Colors.PRIMARY)
                .setTitle(`🏆 Voice Milestones & Progress — ${stats.username}`)
                .setDescription(`Unlock exclusive Voice XP, Coins, and badges by spending quality time in voice channels!\n`)
                .setFooter({ text: FOOTER_TEXT })
                .setTimestamp();
            for (const m of stats.milestones) {
                const statusBadge = m.unlocked ? "✅ **UNLOCKED**" : `⏳ In Progress (${m.minutes} mins)`;
                const progressBar = renderProgressBar(m.progressPercent, 10);
                embed.addFields({
                    name: `${m.emoji} ${m.name} (${m.minutes}m) — ${statusBadge}`,
                    value: `*${m.description}*\n${progressBar}\n**Reward:** +${m.xp} XP • +${m.coins} Coins`,
                    inline: false,
                });
            }
            await interaction.reply({ embeds: [embed] });
            return;
        }
        // ── 3. REWARDS / SHOP ───────────────────────────────────
        if (sub === "rewards") {
            const action = interaction.options.getString("action", true);
            const itemId = interaction.options.getString("item_id");
            if (action === "buy") {
                if (!itemId) {
                    await interaction.reply({
                        embeds: [createErrorEmbed("Please specify an `item_id` to purchase. Use `/heart rewards action:browse` to view available items.")],
                        ephemeral: true,
                    });
                    return;
                }
                const result = await heartShopService.purchaseItem(guildId, interaction.user.id, interaction.user.username, itemId);
                if (!result.success) {
                    await interaction.reply({ embeds: [createErrorEmbed(result.message)], ephemeral: true });
                    return;
                }
                await interaction.reply({
                    embeds: [
                        createSuccessEmbed(`${result.message}\nRemaining Balance: 🪙 **${result.remainingCoins} Coins**`, "Purchase Successful!"),
                    ],
                });
                return;
            }
            // Catalog view
            const catalog = heartShopService.getCatalog();
            const member = await memberRepository.findOrCreate(guildId, interaction.user.id, interaction.user.username);
            const embed = new EmbedBuilder()
                .setColor(Colors.PRIMARY)
                .setTitle("🎁 NEXUS Voice Heart Reward Shop")
                .setDescription(`Spend your voice coins to acquire prestigious titles, profile badges, and cosmetics!\n` +
                `Your Balance: 🪙 **${formatNumber(member.coins)} Coins**\n\n` +
                `To buy an item, use: \`/heart rewards action:buy item_id:<ID>\``)
                .setFooter({ text: FOOTER_TEXT })
                .setTimestamp();
            const titles = catalog.filter((i) => i.category === "title");
            const badges = catalog.filter((i) => i.category === "badge");
            const decos = catalog.filter((i) => i.category === "decoration");
            embed.addFields({
                name: "🏷️ Exclusive Titles",
                value: titles.map((t) => `${t.emoji} **${t.name}** — 🪙 \`${t.price}\` coins\n*${t.description}* (ID: \`${t.id}\`)`).join("\n\n"),
            }, {
                name: "🏅 Prestige Badges",
                value: badges.map((b) => `${b.emoji} **${b.name}** — 🪙 \`${b.price}\` coins\n*${b.description}* (ID: \`${b.id}\`)`).join("\n\n"),
            }, {
                name: "✨ Profile Decorations",
                value: decos.map((d) => `${d.emoji} **${d.name}** — 🪙 \`${d.price}\` coins\n*${d.description}* (ID: \`${d.id}\`)`).join("\n\n"),
            });
            await interaction.reply({ embeds: [embed] });
            return;
        }
        // ── 4. SETTINGS ─────────────────────────────────────────
        if (sub === "settings") {
            const personality = interaction.options.getString("personality");
            const language = interaction.options.getString("language");
            const greetings = interaction.options.getBoolean("greetings");
            const updates = {};
            if (personality)
                updates.personality = personality;
            if (language)
                updates.language = language;
            if (typeof greetings === "boolean")
                updates.greetingsEnabled = greetings;
            const updated = await heartConfigService.updateUserPreferences(guildId, interaction.user.id, updates);
            const embed = createSuccessEmbed(`Your personal Voice Companion settings have been updated!\n\n` +
                `• **Personality:** \`${updated.personality.toUpperCase()}\`\n` +
                `• **Language:** \`${updated.language.toUpperCase()}\`\n` +
                `• **Voice Greetings:** ${updated.greetingsEnabled ? "✅ Enabled" : "❌ Disabled"}`, "Voice Companion Settings Updated");
            await interaction.reply({ embeds: [embed], ephemeral: true });
            return;
        }
        // ── 5. PRIVACY ──────────────────────────────────────────
        if (sub === "privacy") {
            const consent = interaction.options.getString("consent");
            const deleteData = interaction.options.getBoolean("delete_data");
            if (deleteData) {
                // Erase participation records & rewards
                await prisma.heartReward.deleteMany({
                    where: { guildId, userId: interaction.user.id },
                });
                await prisma.guildMember.update({
                    where: { guildId_userId: { guildId, userId: interaction.user.id } },
                    data: { voiceMinutes: 0 },
                });
                await interaction.reply({
                    embeds: [createSuccessEmbed("All your stored voice participation data, milestones, and session records have been permanently erased.", "Data Erasure Complete")],
                    ephemeral: true,
                });
                return;
            }
            if (consent) {
                const isOptIn = consent === "opt-in";
                const member = await memberRepository.findByGuildAndUser(guildId, interaction.user.id);
                const consentFlags = member?.consentFlags ? JSON.parse(member.consentFlags) : {};
                consentFlags.voiceIntelligence = isOptIn;
                await prisma.guildMember.update({
                    where: { guildId_userId: { guildId, userId: interaction.user.id } },
                    data: { consentFlags: JSON.stringify(consentFlags) },
                });
                await interaction.reply({
                    embeds: [
                        createSuccessEmbed(`Voice Intelligence Consent set to: **${isOptIn ? "Opted In (Active)" : "Opted Out (Disabled)"}**.\n` +
                            `NEXUS AI strictly adheres to zero unauthorized audio recording.`, "Privacy Preferences Updated"),
                    ],
                    ephemeral: true,
                });
                return;
            }
            // View current privacy
            const member = await memberRepository.findByGuildAndUser(guildId, interaction.user.id);
            const consentFlags = member?.consentFlags ? JSON.parse(member.consentFlags) : {};
            const isConsenting = Boolean(consentFlags.voiceIntelligence);
            const embed = new EmbedBuilder()
                .setColor(Colors.PRIMARY)
                .setTitle("🔒 Voice Privacy & Data Ownership")
                .setDescription(`**Current Voice Intelligence Status:** ${isConsenting ? "✅ Opted In" : "❌ Opted Out"}\n\n` +
                `**Privacy Commitments:**\n` +
                `• Raw audio is **never** secretly recorded or stored.\n` +
                `• Audio speech analysis processes temporarily in-memory only.\n` +
                `• You retain full ownership of your data.\n\n` +
                `Use \`/heart privacy consent:opt-out\` or \`/heart privacy delete_data:true\` anytime.`)
                .setFooter({ text: FOOTER_TEXT });
            await interaction.reply({ embeds: [embed], ephemeral: true });
            return;
        }
        // ── 6. NOTIFICATIONS ────────────────────────────────────
        if (sub === "notifications") {
            const pings = interaction.options.getBoolean("pings", true);
            await heartConfigService.updateUserPreferences(guildId, interaction.user.id, { appreciationPings: pings });
            await interaction.reply({
                embeds: [createSuccessEmbed(`Milestone appreciation pings set to: **${pings ? "Enabled (Will ping)" : "Disabled (Silent cards)"}**`, "Notification Settings Updated")],
                ephemeral: true,
            });
            return;
        }
        // ── 7. LEADERBOARD ──────────────────────────────────────
        if (sub === "leaderboard") {
            const topMembers = await prisma.guildMember.findMany({
                where: { guildId, voiceMinutes: { gt: 0 } },
                orderBy: { voiceMinutes: "desc" },
                take: 10,
            });
            const embed = new EmbedBuilder()
                .setColor(Colors.PRIMARY)
                .setTitle("❤️ Voice Community Champions")
                .setDescription("Top members who dedicate their time to making our voice rooms vibrant and welcoming!\n")
                .setFooter({ text: FOOTER_TEXT })
                .setTimestamp();
            if (topMembers.length === 0) {
                embed.setDescription("No voice activity recorded yet. Jump in a voice room to climb the ranks!");
            }
            else {
                const lines = topMembers.map((m, index) => {
                    const medal = index === 0 ? "🥇" : index === 1 ? "🥈" : index === 2 ? "🥉" : `**#${index + 1}**`;
                    const hours = (m.voiceMinutes / 60).toFixed(1);
                    return `${medal} **${m.username}** — **${hours}h** (${formatNumber(m.voiceMinutes)} mins) • 🪙 ${formatNumber(m.coins)}`;
                });
                embed.setDescription(lines.join("\n\n"));
            }
            await interaction.reply({ embeds: [embed] });
            return;
        }
    },
};
//# sourceMappingURL=heart.js.map