/**
 * Watch Party Service for NEXUS AI.
 * Handles community watch party scheduling, RSVP list management,
 * live party announcements, and interactive Discord card components.
 */
import { EmbedBuilder, ActionRowBuilder, ButtonBuilder } from "discord.js";
export interface WatchPartyData {
    id: string;
    guildId: string;
    hostId: string;
    title: string;
    description: string | null;
    streamUrl: string;
    voiceChannelId: string | null;
    scheduledFor: Date;
    status: string;
    rsvpUsers: string;
    createdAt: Date;
}
export declare class WatchPartyService {
    /**
     * Schedules a new community watch party.
     */
    scheduleParty(guildId: string, hostId: string, title: string, streamUrl: string, scheduledFor: Date, description?: string, voiceChannelId?: string): Promise<WatchPartyData>;
    /**
     * Toggles a user's RSVP status for a watch party.
     */
    toggleRsvp(partyId: string, userId: string): Promise<{
        rsvpCount: number;
        isRsvpd: boolean;
    }>;
    /**
     * Retrieves upcoming scheduled watch parties for a guild.
     */
    getUpcoming(guildId: string, limit?: number): Promise<WatchPartyData[]>;
    /**
     * Updates party status to live or ended.
     */
    updateStatus(partyId: string, status: "live" | "ended" | "cancelled"): Promise<WatchPartyData>;
    /**
     * Renders the interactive Discord embed and RSVP button for a watch party.
     */
    renderPartyCard(party: WatchPartyData): {
        embed: EmbedBuilder;
        row: ActionRowBuilder<ButtonBuilder>;
    };
}
export declare const watchPartyService: WatchPartyService;
