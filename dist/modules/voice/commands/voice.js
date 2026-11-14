/**
 * /voice slash command group.
 * Voice activity stats, milestones, temporary room creator, assistant joining,
 * audio quality advisor, and privacy consent management.
 */
import { SlashCommandBuilder, EmbedBuilder, ChannelType, } from "discord.js";
import { VOICE } from "../../../config/features.js";
import { PermissionLevel } from "../../../types/index.js";
import { Colors, createErrorEmbed, createSuccessEmbed } from "../../../utils/embeds.js";
import { FOOTER_TEXT, EMOJIS } from "../../../utils/constants.js";
import { memberRepository } from "../../../database/index.js";
import { voiceTrackerService, VOICE_MILESTONES } from "../services/voice-tracker.service.js";
import { tempRoomService } from "../services/temp-room.service.js";
import { voiceAssistantService } from "../services/voice-assistant.service.js";
import { heartConfigService } from "../services/heart-config.service.js";
import { formatDuration, formatNumber } from "../../../utils/helpers.js";
export const voiceCommand = {
    data: new SlashCommandBuilder()
        .setName("voice")
        .setDescription("Voice channel statistics, temporary rooms, assistant, and audio advisor")
        .addSubcommand((sub) => sub
        .setName("stats")
        .setDescription("View voice participation statistics and active session duration")
        .addUserOption((opt) => opt
        .setName("member")
        .setDescription("The user whose voice stats to view (defaults to yourself)")
        .setRequired(false)))
        .addSubcommand((sub) => sub.setName("milestones").setDescription("View voice participation milestones and reward tiers"))
        .addSubcommand((sub) => sub
        .setName("create")
        .setDescription("Create a dynamic temporary voice room for yourself and your friends")
        .addStringOption((opt) => opt.setName("name").setDescription("Custom room title").setMaxLength(32).setRequired(false))
        .addIntegerOption((opt) => opt
        .setName("limit")
        .setDescription("Maximum user capacity (0 for unlimited, max 99)")
        .setMinValue(0)
        .setMaxValue(99)
        .setRequired(false))
        .addBooleanOption((opt) => opt
        .setName("private")
        .setDescription("Whether to make the room private (invite-only)")
        .setRequired(false)))
        .addSubcommand((sub) => sub
        .setName("join")
        .setDescription("Summon the NEXUS AI Voice Assistant to your voice channel")
        .addChannelOption((opt) => opt
        .setName("channel")
        .setDescription("Target voice channel (defaults to your current voice room)")
        .addChannelTypes(ChannelType.GuildVoice, ChannelType.GuildStageVoice)
        .setRequired(false)))
        .addSubcommand((sub) => sub.setName("leave").setDescription("Disconnect NEXUS AI Voice Assistant from the current room"))
        .addSubcommand((sub) => sub
        .setName("advisor")
        .setDescription("Get actionable audio quality and Discord client optimization recommendations"))
        .addSubcommand((sub) => sub
        .setName("consent")
        .setDescription("Configure your explicit privacy consent for voice intelligence features")
        .addStringOption((opt) => opt
        .setName("status")
        .setDescription("Select your consent preference")
        .setRequired(true)
        .addChoices({ name: "Opt-In (Allow voice analysis & speaking stats)", value: "opt-in" }, { name: "Opt-Out (Disable all audio analysis)", value: "opt-out" })))
        .addSubcommand((sub) => sub.setName("rooms").setDescription("Inspect all currently active voice rooms in this community"))
        .addSubcommand((sub) => sub
        .setName("autojoin")
        .setDescription("Configure automatic voice joining")
        .addStringOption((opt) => opt
        .setName("action")
        .setDescription("Action to perform")
        .setRequired(true)
        .addChoices({ name: "Enable", value: "enable" }, { name: "Disable", value: "disable" }, { name: "List Channels", value: "channels" }, { name: "Add Allowed Channel", value: "add" }, { name: "Remove Allowed Channel", value: "remove" }))
        .addChannelOption((opt) => opt
        .setName("channel")
        .setDescription("Target voice channel (for add/remove)")
        .addChannelTypes(ChannelType.GuildVoice, ChannelType.GuildStageVoice)
        .setRequired(false)))
        .addSubcommand((sub) => sub
        .setName("greeting")
        .setDescription("Configure voice companion greeting messages")
        .addStringOption((opt) => opt
        .setName("action")
        .setDescription("Enable or disable voice greetings")
        .setRequired(true)
        .addChoices({ name: "Enable", value: "enable" }, { name: "Disable", value: "disable" }))),
    module: VOICE,
    permissions: PermissionLevel.MEMBER,
    cooldownMs: 3000,
    async execute(interaction) {
        const guildId = interaction.guildId;
        if (!guildId || !interaction.guild)
            return;
        const sub = interaction.options.getSubcommand();
        if (sub === "stats") {
            const targetUser = interaction.options.getUser("member") || interaction.user;
            const member = await memberRepository.findOrCreate(guildId, targetUser.id, targetUser.username);
            const activeSession = voiceTrackerService.getActiveSession(guildId, targetUser.id);
            let sessionText = "*Currently not in a voice channel.*";
            if (activeSession) {
                const currentElapsedMs = Date.now() - activeSession.joinedAt;
                sessionText = `🟢 **Active Session:** in <#${activeSession.channelId}> for **${formatDuration(currentElapsedMs)}**`;
            }
            const totalHours = (member.voiceMinutes / 60).toFixed(1);
            // Find next milestone
            const nextMilestone = VOICE_MILESTONES.find((m) => member.voiceMinutes < m.minutes);
            const milestoneText = nextMilestone
                ? `Next Milestone: **${nextMilestone.name}** (${formatNumber(nextMilestone.minutes - member.voiceMinutes)} mins remaining)`
                : "🏆 **All Voice Milestones Achieved!**";
            const embed = new EmbedBuilder()
                .setColor(Colors.PRIMARY)
                .setTitle(`🎙️ Voice Statistics — ${targetUser.username}`)
                .setDescription(sessionText)
                .setThumbnail(targetUser.displayAvatarURL({ size: 256 }))
                .addFields({
                name: "Cumulative Voice Activity",
                value: `**${totalHours} Hours** (${formatNumber(member.voiceMinutes)} Total Minutes)`,
                inline: true,
            }, {
                name: "Milestone Progression",
                value: milestoneText,
                inline: true,
            })
                .setFooter({ text: FOOTER_TEXT })
                .setTimestamp();
            await interaction.reply({ embeds: [embed] });
            return;
        }
        if (sub === "milestones") {
            const lines = VOICE_MILESTONES.map((m) => `${m.emoji} **${m.name}** — \`${m.minutes} Minutes\` (${(m.minutes / 60).toFixed(1)}h)\n` +
                `*Rewards: +${m.rewardXp} XP • +${m.rewardCoins} Coins*`);
            const embed = new EmbedBuilder()
                .setColor(Colors.PRIMARY)
                .setTitle("🎙️ Community Voice Milestones")
                .setDescription("Spend time in server voice rooms to unlock prestigious badges and rewards!\n\n" +
                lines.join("\n\n"))
                .setFooter({ text: FOOTER_TEXT })
                .setTimestamp();
            await interaction.reply({ embeds: [embed] });
            return;
        }
        if (sub === "create") {
            const member = interaction.member;
            const name = interaction.options.getString("name") || undefined;
            const limit = interaction.options.getInteger("limit") ?? 0;
            const isPrivate = interaction.options.getBoolean("private") ?? false;
            await interaction.deferReply({ ephemeral: true });
            try {
                const channel = await tempRoomService.createRoom(interaction.guild, member, {
                    name,
                    userLimit: limit,
                    isPrivate,
                });
                await interaction.editReply({
                    embeds: [
                        createSuccessEmbed("Voice Room Created", `Created temporary voice room <#${channel.id}>!\n` +
                            `• **Capacity:** ${limit === 0 ? "Unlimited" : `${limit} members`}\n` +
                            `• **Privacy:** ${isPrivate ? "Private (Invite Only)" : "Public"}\n\n` +
                            `*Note: The room will automatically clean up when all members leave.*`),
                    ],
                });
            }
            catch (err) {
                await interaction.editReply({
                    embeds: [createErrorEmbed("Creation Failed", `Failed to create voice channel: ${err.message}`)],
                });
            }
            return;
        }
        if (sub === "join") {
            const member = interaction.member;
            const specifiedChannel = interaction.options.getChannel("channel");
            const targetChannel = specifiedChannel || member.voice.channel;
            if (!targetChannel || !("isVoiceBased" in targetChannel) || !targetChannel.isVoiceBased()) {
                await interaction.reply({
                    embeds: [
                        createErrorEmbed("Channel Required", "You must either specify a voice channel or be currently connected to one."),
                    ],
                    ephemeral: true,
                });
                return;
            }
            await interaction.deferReply();
            try {
                await voiceAssistantService.join(targetChannel);
                await interaction.editReply({
                    embeds: [
                        createSuccessEmbed("Voice Assistant Connected", `Connected to <#${targetChannel.id}>. NEXUS AI Voice Assistant is now active.`),
                    ],
                });
            }
            catch (err) {
                await interaction.editReply({
                    embeds: [createErrorEmbed("Connection Failed", `Unable to join voice room: ${err.message}`)],
                });
            }
            return;
        }
        if (sub === "leave") {
            const disconnected = voiceAssistantService.leave(guildId);
            if (disconnected) {
                await interaction.reply({
                    embeds: [createSuccessEmbed("Disconnected", "NEXUS AI has disconnected from the voice room.")],
                });
            }
            else {
                await interaction.reply({
                    embeds: [createErrorEmbed("Not Connected", "NEXUS AI is not currently connected to any voice room.")],
                    ephemeral: true,
                });
            }
            return;
        }
        if (sub === "advisor") {
            const member = interaction.member;
            const currentChannel = member.voice.channel;
            const advice = currentChannel
                ? voiceAssistantService.getAudioOptimizationAdvice(currentChannel)
                : null;
            const embed = new EmbedBuilder()
                .setColor(Colors.PRIMARY)
                .setTitle(`${EMOJIS.GEAR} Audio Quality & Client Optimization Advisor`)
                .setDescription("Ensure crystal-clear audio quality during voice conversations with these recommended adjustments:\n\n" +
                (advice
                    ? `**Current Channel Bitrate:** \`${advice.bitrateKbps} kbps\` — *${advice.recommendation}*\n\n`
                    : "") +
                `• **Noise Suppression (Krisp):** Enable Krisp in Discord's \`Voice & Video\` settings to eliminate fan and keyboard noise.\n` +
                `• **Prevent Clipping Distortion:** Keep your Discord microphone input slider at **70–80%** rather than 100% to prevent digital audio clipping.\n` +
                `• **Echo Cancellation:** Keep Echo Cancellation enabled if you are not using headphones to avoid audio feedback.\n` +
                `• **Optimal Bitrate:** 64 kbps is ideal for casual chat, 96 kbps for gaming squads, and 128+ kbps for streaming/podcasts.`)
                .setFooter({ text: FOOTER_TEXT })
                .setTimestamp();
            await interaction.reply({ embeds: [embed] });
            return;
        }
        if (sub === "consent") {
            const statusChoice = interaction.options.getString("status", true);
            const isOptIn = statusChoice === "opt-in";
            await voiceAssistantService.setConsent(guildId, interaction.user.id, isOptIn);
            const embed = isOptIn
                ? createSuccessEmbed("Voice Intelligence Consent: OPTED IN", "You have granted explicit consent for participation in voice intelligence features (speech statistics, transcription).\n\n" +
                    "🔒 *Privacy Guarantee: NEXUS AI never secretly records audio. You can opt out at any time via `/voice consent status:opt-out`.*")
                : createSuccessEmbed("Voice Intelligence Consent: OPTED OUT", "You have opted out. Your voice audio will never be analyzed by NEXUS AI.");
            await interaction.reply({ embeds: [embed], ephemeral: true });
            return;
        }
        if (sub === "rooms") {
            const rooms = voiceTrackerService.getActiveRooms(interaction.guild);
            const embed = new EmbedBuilder()
                .setColor(Colors.PRIMARY)
                .setTitle("📻 Active Community Voice Rooms")
                .setDescription(`Occupancy in **${interaction.guild.name}**:`)
                .setFooter({ text: FOOTER_TEXT })
                .setTimestamp();
            if (rooms.length === 0) {
                embed.setDescription("No community members are currently active in voice rooms.");
            }
            else {
                for (const room of rooms) {
                    embed.addFields({
                        name: `🔊 ${room.name} (${room.memberCount} members)`,
                        value: `**Occupants:** ${room.members.join(", ")}`,
                        inline: false,
                    });
                }
            }
            await interaction.reply({ embeds: [embed] });
            return;
        }
        if (sub === "autojoin") {
            const member = interaction.member;
            if (!member?.permissions?.has("ManageGuild") && !member?.permissions?.has("Administrator")) {
                await interaction.reply({
                    embeds: [createErrorEmbed("You must have `Manage Server` permissions to configure automatic voice joining.")],
                    ephemeral: true,
                });
                return;
            }
            const action = interaction.options.getString("action", true);
            const targetChannel = interaction.options.getChannel("channel");
            if (action === "enable") {
                await heartConfigService.setAutoJoin(guildId, true);
                await interaction.reply({
                    embeds: [createSuccessEmbed("Automatic Voice Joining has been **enabled** for this server! NEXUS AI will now warmly accompany members in active voice channels.", "Voice Auto-Join Enabled")],
                });
                return;
            }
            if (action === "disable") {
                await heartConfigService.setAutoJoin(guildId, false);
                await interaction.reply({
                    embeds: [createSuccessEmbed("Automatic Voice Joining has been **disabled** for this server.", "Voice Auto-Join Disabled")],
                });
                return;
            }
            if (action === "add") {
                if (!targetChannel) {
                    await interaction.reply({ embeds: [createErrorEmbed("Please specify a voice channel to add to the whitelist.")], ephemeral: true });
                    return;
                }
                await heartConfigService.addAllowedChannel(guildId, targetChannel.id);
                await interaction.reply({ embeds: [createSuccessEmbed(`Added <#${targetChannel.id}> to the auto-join whitelist.`, "Channel Added")] });
                return;
            }
            if (action === "remove") {
                if (!targetChannel) {
                    await interaction.reply({ embeds: [createErrorEmbed("Please specify a voice channel to remove from the whitelist.")], ephemeral: true });
                    return;
                }
                await heartConfigService.removeAllowedChannel(guildId, targetChannel.id);
                await interaction.reply({ embeds: [createSuccessEmbed(`Removed <#${targetChannel.id}> from the auto-join whitelist.`, "Channel Removed")] });
                return;
            }
            if (action === "channels") {
                const settings = await heartConfigService.getGuildSettings(guildId);
                const listText = settings.allowedChannels.length > 0
                    ? settings.allowedChannels.map((c) => `• <#${c}>`).join("\n")
                    : "*No specific whitelist configured (NEXUS AI can join all non-excluded voice channels).*";
                const embed = new EmbedBuilder()
                    .setColor(Colors.PRIMARY)
                    .setTitle("🎙️ Auto-Join Channel Configuration")
                    .setDescription(`**Auto-Join Status:** ${settings.autojoinEnabled ? "✅ Enabled" : "❌ Disabled"}\n\n**Allowed Voice Channels:**\n${listText}`)
                    .setFooter({ text: FOOTER_TEXT });
                await interaction.reply({ embeds: [embed] });
                return;
            }
        }
        if (sub === "greeting") {
            const member = interaction.member;
            if (!member?.permissions?.has("ManageGuild") && !member?.permissions?.has("Administrator")) {
                await interaction.reply({
                    embeds: [createErrorEmbed("You must have `Manage Server` permissions to configure voice companion greetings.")],
                    ephemeral: true,
                });
                return;
            }
            const action = interaction.options.getString("action", true);
            const isEnable = action === "enable";
            await heartConfigService.setGreetings(guildId, isEnable);
            await interaction.reply({
                embeds: [createSuccessEmbed(`Voice companion greetings are now **${isEnable ? "Enabled" : "Disabled"}** for this server!`, "Voice Greetings Updated")],
            });
            return;
        }
    },
};
//# sourceMappingURL=voice.js.map