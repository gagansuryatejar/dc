/**
 * Interactive Support Ticket Engine for NEXUS AI.
 * Manages dynamic private support channels, categorized ticket routing,
 * transcript generation, and ticket resolution workflows.
 */
import { Guild, User, EmbedBuilder, ActionRowBuilder, ButtonBuilder, TextChannel } from "discord.js";
export interface TicketSummary {
    id: string;
    ticketNumber: number;
    guildId: string;
    channelId: string | null;
    creatorId: string;
    creatorUsername: string;
    subject: string;
    category: string;
    status: string;
    closedBy: string | null;
    closedAt: Date | null;
    closeReason: string | null;
    createdAt: Date;
}
export declare class TicketService {
    /**
     * Generates the public Support Panel embed and category buttons for a server channel.
     */
    renderPanel(): {
        embeds: EmbedBuilder[];
        components: ActionRowBuilder<ButtonBuilder>[];
    };
    /**
     * Creates a private support ticket and associated Discord text channel.
     */
    createTicket(guild: Guild, user: User, category?: string, subject?: string): Promise<{
        ticket: TicketSummary;
        channel: TextChannel | null;
    }>;
    /**
     * Closes and archives a support ticket.
     */
    closeTicket(guildId: string, ticketId: string, closedByUserId: string, reason?: string, channelToClose?: TextChannel): Promise<TicketSummary>;
    /**
     * Retrieves ticket details by database ID.
     */
    getTicket(id: string): Promise<TicketSummary | null>;
    /**
     * Retrieves ticket details by channel ID.
     */
    getTicketByChannel(channelId: string): Promise<TicketSummary | null>;
}
export declare const ticketService: TicketService;
