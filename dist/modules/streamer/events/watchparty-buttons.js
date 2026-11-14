/**
 * Watch Party RSVP Button Interaction Handler for NEXUS AI.
 */
import { watchPartyService } from "../services/watch-party.service.js";
import { STREAMER } from "../../../config/features.js";
export const watchPartyButtonsEvent = {
    name: "interactionCreate",
    once: false,
    module: STREAMER,
    async execute(interaction) {
        if (!interaction.isButton())
            return;
        const button = interaction;
        if (!button.customId.startsWith("watchparty_rsvp_"))
            return;
        const partyId = button.customId.replace("watchparty_rsvp_", "");
        await button.deferReply({ ephemeral: true });
        try {
            const { rsvpCount, isRsvpd } = await watchPartyService.toggleRsvp(partyId, button.user.id);
            // Re-fetch party to re-render card
            const upcoming = await watchPartyService.getUpcoming(button.guildId);
            const party = upcoming.find((p) => p.id === partyId);
            if (party && button.message) {
                const { embed, row } = watchPartyService.renderPartyCard(party);
                await button.message.edit({ embeds: [embed], components: [row] }).catch(() => null);
            }
            await button.editReply({
                content: isRsvpd
                    ? `🎟️ **RSVP Confirmed!** You are attending this watch party (Total RSVPs: ${rsvpCount}).`
                    : `🎟️ **RSVP Cancelled.** You have removed your attendance (Total RSVPs: ${rsvpCount}).`,
            });
        }
        catch (err) {
            const msg = err instanceof Error ? err.message : "Failed to toggle RSVP";
            await button.editReply({ content: `❌ ${msg}` });
        }
    },
};
//# sourceMappingURL=watchparty-buttons.js.map