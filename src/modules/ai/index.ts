/**
 * AI module definition for NEXUS AI.
 * Natural language chat, multilingual support (Telugu & English), channel summarization,
 * draft announcements, and approved server knowledge FAQs.
 */

import { AI } from "../../config/features.js";
import type { NexusModule, ModuleHealth } from "../../types/index.js";
import { createModuleLogger } from "../../utils/logger.js";
import { aiCommand } from "./commands/ai.js";
import { pulseCommand } from "./commands/pulse.js";
import { companionCommand } from "./commands/companion.js";
import { loreCommand } from "./commands/lore.js";
import { gameCommand } from "./commands/game.js";
import { aiMentionEvent } from "./events/ai-mention.js";
import { gameButtonsEvent } from "./events/game-buttons.js";
import { aiOrchestratorService } from "./services/ai-orchestrator.service.js";

const logger = createModuleLogger("module:ai");

export class AIModule implements NexusModule {
  public readonly name = AI;
  public readonly description =
    "Advanced AI brain, multilingual chat (Telugu & English), community pulse, voice companion, server lore, and interactive games";
  public readonly version = "1.0.0";

  public readonly commands = [aiCommand, pulseCommand, companionCommand, loreCommand, gameCommand];
  public readonly events = [aiMentionEvent, gameButtonsEvent];

  async onLoad(): Promise<void> {
    const providers = aiOrchestratorService.getActiveProviders();
    logger.info(`Initializing AI Brain Subsystem... Active Providers: [${providers.join(", ")}]`);
  }

  async onUnload(): Promise<void> {
    logger.info("AI Brain Subsystem unloaded.");
  }

  async onEnable(): Promise<void> {
    logger.info("AI Brain Subsystem enabled.");
  }

  async onDisable(): Promise<void> {
    logger.info("AI Brain Subsystem disabled.");
  }

  async healthCheck(): Promise<ModuleHealth> {
    const active = aiOrchestratorService.getActiveProviders();
    return {
      status: "healthy",
      message: `AI brain operational with active pipelines: ${active.join(", ")}`,
      lastCheck: new Date(),
    };
  }
}

export const aiModule = new AIModule();
export default aiModule;
