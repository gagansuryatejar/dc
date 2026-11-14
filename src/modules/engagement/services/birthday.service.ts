/**
 * Birthday and anniversary tracking engine for NEXUS AI.
 */

import { type Client, EmbedBuilder } from "discord.js";
import { prisma, guildRepository, memberRepository } from "../../../database/index.js";
import { createModuleLogger } from "../../../utils/logger.js";
import { Colors } from "../../../utils/embeds.js";
import { FOOTER_TEXT } from "../../../utils/constants.js";

const logger = createModuleLogger("engagement:birthday");

export class BirthdayService {
  private timer?: NodeJS.Timeout;
  private readonly celebratedThisYear = new Set<string>();

  /**
   * Validates birthday format: MM-DD (e.g. "07-15", "12-04")
   */
  isValidBirthday(str: string): boolean {
    if (!/^\d{2}-\d{2}$/.test(str)) return false;
    const [month, day] = str.split("-").map(Number);
    if (!month || !day) return false;
    if (month < 1 || month > 12) return false;
    if (day < 1 || day > 31) return false;

    // Check months with 30 days
    if ([4, 6, 9, 11].includes(month) && day > 30) return false;
    // February max 29
    if (month === 2 && day > 29) return false;

    return true;
  }

  /**
   * Returns current MM-DD in UTC (or adjusted by timezone).
   */
  getTodayString(timezone = "UTC"): string {
    const now = new Date();
    try {
      const formatter = new Intl.DateTimeFormat("en-US", {
        timeZone: timezone,
        month: "2-digit",
        day: "2-digit",
      });
      const parts = formatter.formatToParts(now);
      const month = parts.find((p) => p.type === "month")?.value;
      const day = parts.find((p) => p.type === "day")?.value;
      return `${month}-${day}`;
    } catch {
      const m = String(now.getUTCMonth() + 1).padStart(2, "0");
      const d = String(now.getUTCDate()).padStart(2, "0");
      return `${m}-${d}`;
    }
  }

  /**
   * Scans for members with birthdays today and posts celebratory announcement cards.
   */
  async checkBirthdays(client: Client): Promise<void> {
    try {
      const year = new Date().getUTCFullYear();
      const guilds = client.guilds.cache;

      for (const [guildId, discordGuild] of guilds) {
        const guildData = await guildRepository.findById(guildId);
        const tz = guildData?.timezone || "UTC";
        const todayStr = this.getTodayString(tz);

        const celebrants = await prisma.guildMember.findMany({
          where: {
            guildId,
            birthday: todayStr,
          },
        });

        if (celebrants.length === 0) continue;

        const targetChannelId = guildData?.announcementChannel || guildData?.welcomeChannel;
        const targetChannel = targetChannelId ? discordGuild.channels.cache.get(targetChannelId) : null;

        for (const celebrant of celebrants) {
          const key = `${guildId}:${celebrant.userId}:${year}`;
          if (this.celebratedThisYear.has(key)) continue;

          this.celebratedThisYear.add(key);

          // Award birthday bonus (500 XP & 250 coins)
          await memberRepository.update(guildId, celebrant.userId, {
            xp: celebrant.xp + 500,
            coins: celebrant.coins + 250,
          });

          // Post celebratory embed if channel is available
          if (targetChannel && targetChannel.isTextBased()) {
            const embed = new EmbedBuilder()
              .setColor(Colors.ACCENT)
              .setTitle(`🎂 Happy Birthday, ${celebrant.displayName || celebrant.username}!`)
              .setDescription(
                `🎉 Today we celebrate <@${celebrant.userId}>!\n\n` +
                  `The entire **${discordGuild.name}** community wishes you an extraordinary day filled with joy and success! 🎈✨\n\n` +
                  `*NEXUS AI has gifted you **+500 XP** and **+250 Coins** in honor of your special day!*`,
              )
              .setThumbnail("https://cdn.discordapp.com/emojis/843849503460655104.png")
              .setFooter({ text: FOOTER_TEXT })
              .setTimestamp();

            await targetChannel.send({
              content: `🎂 Everyone wish a Happy Birthday to <@${celebrant.userId}>!`,
              embeds: [embed],
            });
            logger.info(`Celebrated birthday for ${celebrant.username} in guild ${guildId}`);
          }
        }
      }
    } catch (error) {
      logger.error({ error }, "Error executing birthday check cycle");
    }
  }

  /**
   * Start the recurring daily scanner.
   */
  startScheduler(client: Client): void {
    // Initial run after 10 seconds
    setTimeout(() => this.checkBirthdays(client), 10_000);

    // Check hourly
    this.timer = setInterval(() => this.checkBirthdays(client), 60 * 60 * 1000);
    if (this.timer.unref) this.timer.unref();
  }

  stopScheduler(): void {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = undefined;
    }
  }
}

export const birthdayService = new BirthdayService();
