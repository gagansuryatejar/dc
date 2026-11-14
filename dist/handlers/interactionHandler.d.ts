/**
 * Component interaction handler for NEXUS AI.
 * Routes button clicks, select menu selections, and modal submissions
 * to their registered handlers.
 */
import { type ButtonInteraction, type ModalSubmitInteraction } from "discord.js";
import type { ButtonHandler, SelectMenuHandler, ModalHandler, AnySelectMenuInteraction } from "../types/index.js";
export declare class InteractionHandler {
    private readonly buttons;
    private readonly selectMenus;
    private readonly modals;
    registerButton(handler: ButtonHandler): void;
    registerSelectMenu(handler: SelectMenuHandler): void;
    registerModal(handler: ModalHandler): void;
    /**
     * Route a component interaction to the appropriate handler.
     */
    handle(interaction: ButtonInteraction | AnySelectMenuInteraction | ModalSubmitInteraction): Promise<void>;
}
/** Singleton interaction handler instance. */
export declare const interactionHandler: InteractionHandler;
export default interactionHandler;
