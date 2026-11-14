/**
 * Streamer-Exclusive Voice Lounge Service for NEXUS AI.
 * Creates temporary dedicated creator voice rooms with host controls.
 */
import { Guild, GuildMember, VoiceChannel } from "discord.js";
export declare class StreamerRoomService {
    /**
     * Creates a dedicated streamer voice lounge for a creator.
     */
    createStreamerRoom(guild: Guild, member: GuildMember, customName?: string): Promise<VoiceChannel | null>;
}
export declare const streamerRoomService: StreamerRoomService;
