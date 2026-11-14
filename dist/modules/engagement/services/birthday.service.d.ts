/**
 * Birthday and anniversary tracking engine for NEXUS AI.
 */
import { type Client } from "discord.js";
export declare class BirthdayService {
    private timer?;
    private readonly celebratedThisYear;
    /**
     * Validates birthday format: MM-DD (e.g. "07-15", "12-04")
     */
    isValidBirthday(str: string): boolean;
    /**
     * Returns current MM-DD in UTC (or adjusted by timezone).
     */
    getTodayString(timezone?: string): string;
    /**
     * Scans for members with birthdays today and posts celebratory announcement cards.
     */
    checkBirthdays(client: Client): Promise<void>;
    /**
     * Start the recurring daily scanner.
     */
    startScheduler(client: Client): void;
    stopScheduler(): void;
}
export declare const birthdayService: BirthdayService;
