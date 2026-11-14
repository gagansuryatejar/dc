/**
 * Component interaction handler for NEXUS AI.
 * Routes button clicks, select menu selections, and modal submissions
 * to their registered handlers.
 */
import { Collection, } from "discord.js";
import { createErrorEmbed } from "../utils/embeds.js";
import logger from "../logger/index.js";
export class InteractionHandler {
    buttons = new Collection();
    selectMenus = new Collection();
    modals = new Collection();
    registerButton(handler) {
        this.buttons.set(handler.customId, handler);
    }
    registerSelectMenu(handler) {
        this.selectMenus.set(handler.customId, handler);
    }
    registerModal(handler) {
        this.modals.set(handler.customId, handler);
    }
    /**
     * Route a component interaction to the appropriate handler.
     */
    async handle(interaction) {
        const customId = interaction.customId;
        if (interaction.isButton()) {
            const handler = this.buttons.get(customId) ??
                this.buttons.find((h) => h.isPrefix === true && customId.startsWith(h.customId));
            if (handler) {
                await handler.execute(interaction);
                return;
            }
        }
        if (interaction.isAnySelectMenu()) {
            const handler = this.selectMenus.get(customId) ??
                this.selectMenus.find((h) => h.isPrefix === true && customId.startsWith(h.customId));
            if (handler) {
                await handler.execute(interaction);
                return;
            }
        }
        if (interaction.isModalSubmit()) {
            const handler = this.modals.get(customId) ??
                this.modals.find((h) => h.isPrefix === true && customId.startsWith(h.customId));
            if (handler) {
                await handler.execute(interaction);
                return;
            }
        }
        logger.warn(`Unhandled component interaction: ${customId}`);
        if (interaction.isRepliable() && !interaction.replied && !interaction.deferred) {
            await interaction.reply({
                embeds: [createErrorEmbed("Unknown Interaction", "This interaction is no longer valid.")],
                ephemeral: true,
            });
        }
    }
}
/** Singleton interaction handler instance. */
export const interactionHandler = new InteractionHandler();
export default interactionHandler;
//# sourceMappingURL=interactionHandler.js.map