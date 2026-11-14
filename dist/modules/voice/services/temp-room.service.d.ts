/**
 * Temporary voice room manager for NEXUS AI.
 * Handles dynamic channel creation, private access permissions, and automated cleanup of abandoned rooms.
 */
import { type Guild, type GuildMember, type VoiceChannel } from "discord.js";
export interface CreateRoomOptions {
    name?: string;
    userLimit?: number;
    isPrivate?: boolean;
}
export declare class TempRoomService {
    /**
     * Creates a dynamic temporary voice room for a member.
     */
    createRoom(guild: Guild, owner: GuildMember, options?: CreateRoomOptions): Promise<VoiceChannel>;
    /**
     * Evaluates if an empty voice channel is a managed temporary room and cleans it up.
     */
    handleRoomState(guild: Guild, channelId: string): Promise<boolean>;
    /**
     * Sweeps SQLite records against active Discord guild channels on startup.
     */
    sweepAbandonedRooms(guild: Guild): Promise<number>;
}
export declare const tempRoomService: TempRoomService;
