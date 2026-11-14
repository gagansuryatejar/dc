/**
 * Welcome interactive button handlers.
 */
import { ENGAGEMENT } from "../../../config/features.js";
import { interactionHandler } from "../../../handlers/interactionHandler.js";
export const welcomeWaveHandler = {
    customId: "welcome_wave",
    isPrefix: true,
    module: ENGAGEMENT,
    async execute(interaction) {
        const targetUserId = interaction.customId.split(":")[1];
        if (interaction.user.id === targetUserId) {
            await interaction.reply({
                content: "👋 You gave yourself a cheerful high-five!",
                ephemeral: true,
            });
            return;
        }
        await interaction.reply({
            content: `👋 <@${interaction.user.id}> welcomed <@${targetUserId}> to the community!`,
        });
    },
};
export const welcomeIntroHandler = {
    customId: "welcome_intro",
    isPrefix: true,
    module: ENGAGEMENT,
    async execute(interaction) {
        await interaction.reply({
            content: "✨ Ready to introduce yourself? Type `/intro bio:Your introduction here` in chat to share your interests with everyone!",
            ephemeral: true,
        });
    },
};
export function registerWelcomeInteractions() {
    interactionHandler.registerButton(welcomeWaveHandler);
    interactionHandler.registerButton(welcomeIntroHandler);
}
//# sourceMappingURL=welcome-buttons.js.map