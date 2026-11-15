/**
 * NEXUS AI — Birthday Tracking Service
 * Validates MM-DD format, handles leap years, calculates next birthday.
 */

const MONTH_DAYS: Record<number, number> = {
  1: 31, 2: 29, 3: 31, 4: 30, 5: 31, 6: 30,
  7: 31, 8: 31, 9: 30, 10: 31, 11: 30, 12: 31,
};

/** Check if a year is a leap year. */
function isLeapYear(year: number): boolean {
  return (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
}

/** Get days in month for a given year. */
function getDaysInMonth(month: number, year: number): number {
  if (month === 2) return isLeapYear(year) ? 29 : 28;
  return MONTH_DAYS[month] || 31;
}

/** Validate MM-DD birthday format. */
export function isValidBirthday(birthday: string): boolean {
  if (!birthday || typeof birthday !== "string") return false;
  const match = birthday.match(/^(\d{2})-(\d{2})$/);
  if (!match) return false;
  const month = parseInt(match[1], 10);
  const day = parseInt(match[2], 10);
  if (month < 1 || month > 12) return false;
  if (day < 1 || day > getDaysInMonth(month, 2024)) return false; // Use leap year for max days
  return true;
}

/** Get today as MM-DD string in specified timezone. */
export function getTodayString(timezone: string = "UTC"): string {
  const now = new Date();
  try {
    const parts = new Intl.DateTimeFormat("en-CA", {
      timeZone: timezone,
      month: "2-digit",
      day: "2-digit",
    }).formatToParts(now);
    const month = parts.find(p => p.type === "month")?.value || "01";
    const day = parts.find(p => p.type === "day")?.value || "01";
    return `${month}-${day}`;
  } catch {
    // Fallback to UTC
    const month = String(now.getUTCMonth() + 1).padStart(2, "0");
    const day = String(now.getUTCDate()).padStart(2, "0");
    return `${month}-${day}`;
  }
}

/** Calculate days until next birthday. */
export function daysUntilBirthday(birthday: string, timezone: string = "UTC"): number {
  if (!isValidBirthday(birthday)) return -1;

  const [monthStr, dayStr] = birthday.split("-");
  const month = parseInt(monthStr, 10);
  const day = parseInt(dayStr, 10);

  const now = new Date();
  const currentYear = parseInt(
    new Intl.DateTimeFormat("en-CA", { timeZone: timezone, year: "numeric" }).format(now),
    10,
  );

  // Try current year
  let nextBirthday = new Date(Date.UTC(currentYear, month - 1, day));
  const todayStr = getTodayString(timezone);

  if (birthday === todayStr) return 0; // Today!

  if (nextBirthday < now) {
    // Already passed this year, try next year
    nextBirthday = new Date(Date.UTC(currentYear + 1, month - 1, day));
  }

  const diffMs = nextBirthday.getTime() - now.getTime();
  return Math.ceil(diffMs / 86400000);
}

/** Check if today is user's birthday. */
export function isBirthdayToday(birthday: string, timezone: string = "UTC"): boolean {
  return birthday === getTodayString(timezone);
}

/** Format birthday for display. */
export function formatBirthday(birthday: string): string {
  if (!isValidBirthday(birthday)) return "Invalid";
  const [monthStr, dayStr] = birthday.split("-");
  const month = parseInt(monthStr, 10);
  const day = parseInt(dayStr, 10);
  const date = new Date(2024, month - 1, day); // Leap year for formatting
  return date.toLocaleDateString("en-US", { month: "long", day: "numeric" });
}

/** Service object for test compatibility. */
export const birthdayService = {
  isValidBirthday,
  getTodayString,
  daysUntilBirthday,
  isBirthdayToday,
  formatBirthday,
};