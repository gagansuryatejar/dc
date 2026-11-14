/**
 * Voice Assistant & Audio Optimization Advisor for NEXUS AI.
 * Handles voice channel connections, audio playback subscriptions,
 * consent-based voice intelligence tracking, and client-side audio optimization advice.
 */
import { joinVoiceChannel, getVoiceConnection, VoiceConnectionStatus, createAudioPlayer, } from "@discordjs/voice";
import { memberRepository } from "../../../database/index.js";
import { isAndroidLightweight } from "../../../config/index.js";
import { createModuleLogger } from "../../../utils/logger.js";
const logger = createModuleLogger("voice:assistant");
export class VoiceAssistantService {
    players = new Map();
    /**
     * Indicates whether native UDP audio receive is bypassed (Android Lightweight Mode).
     */
    isAudioBypassed() {
        return isAndroidLightweight;
    }
    /**
     * Connect to an authorized voice channel.
     */
    async join(channel) {
        const guildId = channel.guild.id;
        if (this.isAudioBypassed()) {
            logger.info({ guildId, channelId: channel.id }, "Android Lightweight Mode active: Audio stream decoding bypassed to preserve battery & avoid native C++ overhead.");
        }
        else {
            logger.info({ guildId, channelId: channel.id }, "Connecting to voice channel...");
        }
        const connection = joinVoiceChannel({
            channelId: channel.id,
            guildId,
            adapterCreator: channel.guild.voiceAdapterCreator,
            selfDeaf: false,
            selfMute: false,
        });
        let player = this.players.get(guildId);
        if (!player) {
            player = createAudioPlayer();
            player.on("error", (error) => {
                logger.error({ error, guildId }, "Audio player error in voice connection");
            });
            this.players.set(guildId, player);
        }
        connection.subscribe(player);
        connection.on(VoiceConnectionStatus.Ready, () => {
            logger.info({ guildId }, "Voice connection handshake ready and operational.");
        });
        connection.on(VoiceConnectionStatus.Disconnected, async () => {
            logger.warn({ guildId }, "Voice connection disconnected.");
        });
        return connection;
    }
    /**
     * Disconnect and clean up voice resources for a guild.
     */
    leave(guildId) {
        const connection = getVoiceConnection(guildId);
        if (connection) {
            connection.destroy();
            this.players.delete(guildId);
            logger.info({ guildId }, "Disconnected from voice channel.");
            return true;
        }
        return false;
    }
    /**
     * Check if bot is connected to voice in a guild.
     */
    isConnected(guildId) {
        const connection = getVoiceConnection(guildId);
        return connection?.state.status === VoiceConnectionStatus.Ready;
    }
    /**
     * Play an audio resource through the guild's active audio player.
     */
    playAudio(guildId, resource) {
        const player = this.players.get(guildId);
        if (!player)
            return false;
        player.play(resource);
        return true;
    }
    /**
     * Generates actionable audio optimization advice for a voice channel.
     */
    getAudioOptimizationAdvice(channel) {
        const bitrateKbps = Math.round(channel.bitrate / 1000);
        let recommendation = "Optimal for standard voice conversations.";
        if (bitrateKbps < 64) {
            recommendation = "Low bitrate detected. Recommend increasing to 64–96 kbps for clear speech fidelity.";
        }
        else if (bitrateKbps > 128) {
            recommendation = "High fidelity bitrate configured. Ideal for music and community podcasts.";
        }
        return {
            bitrateKbps,
            recommendation,
            krispAdvice: "Enable Discord's built-in **Krisp Noise Suppression** (Settings > Voice & Video) to eliminate background keyboard, fan, and room noise.",
            gainAdvice: "Keep Discord's **Automatic Gain Control (AGC)** enabled if participant volumes fluctuate, or disable it if using a dedicated broadcast compressor.",
            clippingAdvice: "To prevent distortion and digital clipping, keep your Discord microphone input volume slider at **70–80%** rather than 100%.",
            regionAdvice: "Ensure the server voice region matches your community's geographic center to minimize latency and packet jitter.",
        };
    }
    /**
     * Evaluate member explicit consent for voice intelligence.
     */
    async hasConsent(guildId, userId) {
        const member = await memberRepository.findByGuildAndUser(guildId, userId);
        if (!member)
            return false;
        try {
            const flags = JSON.parse(member.consentFlags || "{}");
            return Boolean(flags.voiceIntelligence);
        }
        catch {
            return false;
        }
    }
    /**
     * Update member explicit opt-in / opt-out consent.
     */
    async setConsent(guildId, userId, optIn) {
        const member = await memberRepository.findOrCreate(guildId, userId, "User");
        let flags = {};
        try {
            flags = JSON.parse(member.consentFlags || "{}");
        }
        catch {
            flags = {};
        }
        flags.voiceIntelligence = optIn;
        flags.consentUpdatedAt = new Date().toISOString();
        await memberRepository.update(guildId, userId, {
            consentFlags: JSON.stringify(flags),
        });
        logger.info({ guildId, userId, optIn }, "Updated voice intelligence consent preference");
    }
}
export const voiceAssistantService = new VoiceAssistantService();
//# sourceMappingURL=voice-assistant.service.js.map