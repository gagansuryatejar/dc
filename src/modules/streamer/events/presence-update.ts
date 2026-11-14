/**
 * Presence Update Event Handler for Streamer Subsystem.
 * Detects Discord Go Live and external streaming status changes (Twitch, YouTube, Kick).
 */

import { Presence, ActivityType } from "discord.js";
import { streamerService } from "../services/streamer.service.js";
import { STREAMER } from "../../../config/features.js";
import type { NexusEvent } from "../../../types/index.js";

export const streamPresenceEvent: NexusEvent<"presenceUpdate"> = {
  name: "presenceUpdate",
  once: false,
  module: STREAMER,
  async execute(oldPresence: Presence | null, newPresence: Presence): Promise<void> {
    if (!newPresence.guild || !newPresence.member || newPresence.member.user.bot) {
      return;
    }

    const wasStreaming = oldPresence?.activities.some(
      (a) => a.type === ActivityType.Streaming,
    );
    const streamingActivity = newPresence.activities.find(
      (a) => a.type === ActivityType.Streaming,
    );
    const isStreaming = Boolean(streamingActivity);

    // Stream started transition
    if (!wasStreaming && isStreaming && streamingActivity) {
      await streamerService.onStreamStart(newPresence.guild, newPresence.member, {
        streamTitle: streamingActivity.details || streamingActivity.name,
        streamUrl: streamingActivity.url || undefined,
        gameName: streamingActivity.state || undefined,
      });
      return;
    }

    // Stream ended transition
    if (wasStreaming && !isStreaming) {
      await streamerService.onStreamEnd(newPresence.guild, newPresence.member);
      return;
    }
  },
};
