/**
 * NEXUS HEART — Voice Connection Manager
 * Manages ONE active voice connection per guild (singleton pattern).
 * Handles auto-join, idle detection, and disconnect countdown.
 */

import {
  VoiceConnection,
  joinVoiceChannel,
  type DiscordGatewayAdapterLibraryMethods,
  type DiscordGatewayAdapterImplementerMethods,
  VoiceConnectionStatus,
} from "@discordjs/voice";
import { createModuleLogger } from "../../../utils/logger.js";
import { IDLE_TIMEOUT_MS } from "../../../utils/constants.js";
import { VOICE_XP_PER_MINUTE } from "../../../modules/engagement/services/level.service.js";
import { memberRepository } from "../../../database/index.js";

const log = createModuleLogger("voice:connectionManager");

export interface VoiceConnectionInfo {
  connection: VoiceConnection;
  channelId: string;
  joinedAt: number;
  lastActivity: number;
  isIdle: boolean;
  idleTimer?: ReturnType<typeof setTimeout>;
  speakingMembers: Set<string>;
}

export interface GuildVoiceState {
  connectionInfo: VoiceConnectionInfo | null;
  idleTimeoutMs: number;
  lastMemberCount: number;
}

const IDLE_COUNTDOWN_MS = 30_000;

const guildStates = new Map<string, GuildVoiceState>();

let gatewaySendPayload: ((payload: any) => boolean) | null = null;

export const setGatewaySendPayload = (sender: (payload: any) => boolean): void => {
  gatewaySendPayload = sender;
};

export const connectionManager = {
  /**
   * Get or create voice connection for a guild.
   * Returns null if bot cannot join (no channel permission).
   */
  async joinOrCreate(
    guildId: string,
    channelId: string,
  ): Promise<VoiceConnection | null> {
    const state = guildStates.get(guildId) || {
      connectionInfo: null,
      idleTimeoutMs: IDLE_TIMEOUT_MS,
      lastMemberCount: 0,
    };

    if (state.connectionInfo?.connection.state.status === VoiceConnectionStatus.Ready) {
      log.debug({ guildId, channelId }, "Already connected to voice channel");
      return state.connectionInfo.connection;
    }

    try {
      log.info({ guildId, channelId }, "Attempting to join voice channel");

      if (!gatewaySendPayload) {
        log.warn({ guildId }, "No gateway send function available");
        return null;
      }

      const connection = joinVoiceChannel({
        guildId,
        channelId,
        adapterCreator: createVoiceAdapter(gatewaySendPayload),
      });

      let readyTimer: ReturnType<typeof setTimeout> | null = null;
      let resolved = false;

      const ready = new Promise<boolean>((resolve) => {
        connection.on(VoiceConnectionStatus.Ready, () => {
          resolved = true;
          if (readyTimer) clearTimeout(readyTimer);
          resolve(true);
        });
        connection.on("error", (error: Error) => {
          resolved = true;
          if (readyTimer) clearTimeout(readyTimer);
          log.error({ guildId, error }, "Voice connection error");
          resolve(false);
        });
        readyTimer = setTimeout(() => {
          if (!resolved) {
            resolve(false);
          }
        }, 10_000);
      });

      const isReady = await ready;
      if (!isReady) {
        log.warn({ guildId }, "Voice connection timed out");
        return null;
      }

      const voiceInfo: VoiceConnectionInfo = {
        connection,
        channelId,
        joinedAt: Date.now(),
        lastActivity: Date.now(),
        isIdle: false,
        speakingMembers: new Set(),
      };

      state.connectionInfo = voiceInfo;
      guildStates.set(guildId, state);

      connection.on("stateChange", (_oldState, newState) => {
        log.debug({ guildId, state: newState.status }, "Voice connection state changed");
        if (newState.status === VoiceConnectionStatus.Disconnected) {
          log.warn({ guildId }, "Voice connection disconnected");
          this.leave(guildId);
        }
      });

      log.info({ guildId, channelId }, "Joined voice channel successfully");
      return connection;
    } catch (error) {
      log.error({ guildId, error }, "Failed to join voice channel");
      return null;
    }
  },

  /**
   * Leave voice channel and clean up connection.
   */
  leave(guildId: string): void {
    const state = guildStates.get(guildId);
    if (!state?.connectionInfo) return;

    state.connectionInfo.connection.destroy();
    if (state.connectionInfo.idleTimer) {
      clearTimeout(state.connectionInfo.idleTimer);
    }

    guildStates.delete(guildId);
    log.info({ guildId }, "Left voice channel");
  },

  /**
   * Update speaking member set when voice state changes.
   */
  updateSpeakingMembers(guildId: string, userId: string, isSpeaking: boolean): void {
    const state = guildStates.get(guildId);
    if (!state?.connectionInfo) return;

    if (isSpeaking) {
      state.connectionInfo.speakingMembers.add(userId);
      state.connectionInfo.lastActivity = Date.now();
    } else {
      state.connectionInfo.speakingMembers.delete(userId);
    }
  },

  /**
   * Check if guild has active voice connection.
   */
  hasActiveConnection(guildId: string): boolean {
    const state = guildStates.get(guildId);
    return state?.connectionInfo?.connection.state.status === VoiceConnectionStatus.Ready;
  },

  /**
   * Get connection info for a guild.
   */
  getConnectionInfo(guildId: string): VoiceConnectionInfo | null {
    return guildStates.get(guildId)?.connectionInfo || null;
  },

  /**
   * Start idle detection for a guild.
   */
  startIdleDetection(guildId: string, channelId: string, textChannelId: string): void {
    const state = guildStates.get(guildId);
    if (!state?.connectionInfo) return;

    state.connectionInfo.idleTimer = setTimeout(() => {
      this.handleIdleTimeout(guildId, channelId, textChannelId);
    }, state.idleTimeoutMs);

    state.connectionInfo.isIdle = true;
  },

  /**
   * Reset idle detection (member became active).
   */
  resetIdleDetection(guildId: string): void {
    const state = guildStates.get(guildId);
    if (!state?.connectionInfo) return;

    if (state.connectionInfo.idleTimer) {
      clearTimeout(state.connectionInfo.idleTimer);
    }
    state.connectionInfo.idleTimer = undefined;
    state.connectionInfo.isIdle = false;
    state.connectionInfo.lastActivity = Date.now();
  },

  /**
   * Handle idle timeout with 30-second disconnect countdown.
   */
  async handleIdleTimeout(guildId: string, _voiceChannelId: string, textChannelId: string): Promise<void> {
    const connectionInfo = this.getConnectionInfo(guildId);
    if (!connectionInfo) return;

    const warningMsg = "⚠️ **NEXUS HEART** is idle and will leave in 30 seconds. Say something to stay connected!";
    const disconnectMsg = "🔇 **NEXUS HEART** is disconnecting due to inactivity.";

    try {
      const { REST } = await import("@discordjs/rest");
      const { Routes } = await import("discord-api-types/v10");
      const config = await import("../../../config/index.js").then((m) => m.config);

      const rest = new REST({ version: "10" }).setToken(config.discord.token);

      await rest.post(Routes.channelMessages(textChannelId), {
        body: { content: warningMsg, tts: false },
      });

      await new Promise((resolve) => setTimeout(resolve, IDLE_COUNTDOWN_MS));

      const currentInfo = this.getConnectionInfo(guildId);
      if (!currentInfo || currentInfo.isIdle) {
        await rest.post(Routes.channelMessages(textChannelId), {
          body: { content: disconnectMsg, tts: false },
        });
        this.leave(guildId);
      }
    } catch (error) {
      log.error({ guildId, error }, "Error during idle timeout handling");
    }
  },

  /**
   * Award voice XP to members.
   */
  async awardVoiceXp(guildId: string, userId: string, minutes: number = 1): Promise<void> {
    const xp = minutes * VOICE_XP_PER_MINUTE;
    await memberRepository.incrementXp(guildId, userId, xp);
    await memberRepository.incrementVoiceMinutes(guildId, userId, minutes);
    log.debug({ guildId, userId, minutes, xp }, "Awarded voice XP");
  },

  /**
   * Get all active guild IDs with voice connections.
   */
  getActiveGuilds(): string[] {
    return Array.from(guildStates.entries())
      .filter(([_, state]) => state.connectionInfo?.connection.state.status === VoiceConnectionStatus.Ready)
      .map(([guildId]) => guildId);
  },

  /**
   * Clean up all voice connections.
   */
  shutdown(): void {
    for (const guildId of guildStates.keys()) {
      this.leave(guildId);
    }
    guildStates.clear();
    log.info("All voice connections shut down");
  },
};

function createVoiceAdapter(sendPayload: (payload: any) => boolean): (methods: DiscordGatewayAdapterLibraryMethods) => DiscordGatewayAdapterImplementerMethods {
  return (_methods: DiscordGatewayAdapterLibraryMethods): DiscordGatewayAdapterImplementerMethods => {
    return {
      destroy: () => {},
      sendPayload: (payload: any): boolean => {
        return sendPayload(payload);
      },
    };
  };
}