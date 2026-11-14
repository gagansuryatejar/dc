/**
 * InteractionCreate event handler.
 * Dispatches slash commands, autocomplete, and component interactions (buttons, selects, modals).
 */
import { Events } from "discord.js";
import { CORE } from "../../../config/features.js";
import { createModuleLogger } from "../../../utils/logger.js";
import { commandHandler } from "../../../handlers/commandHandler.js";
import { interactionHandler } from "../../../handlers/interactionHandler.js";
const logger = createModuleLogger("event:interactionCreate");
export const interactionCreateEvent = {
    name: Events.InteractionCreate,
    once: false,
    module: CORE,
    async execute(interaction) {
        try {
            if (interaction.isChatInputCommand()) {
                await commandHandler.handle(interaction);
                return;
            }
            if (interaction.isAutocomplete()) {
                await commandHandler.handleAutocomplete(interaction);
                return;
            }
            if (interaction.isButton() ||
                interaction.isAnySelectMenu() ||
                interaction.isModalSubmit()) {
                await interactionHandler.handle(interaction);
                return;
            }
        }
        catch (error) {
            logger.error({ error, user: interaction.user.id }, "Unhandled error during interaction dispatch");
        }
    },
};
//# sourceMappingURL=interaction-create.js.map