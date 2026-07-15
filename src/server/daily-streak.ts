import { redis } from '@devvit/web/server';

const DAY_MS = 24 * 60 * 60 * 1000;
const MAX_STREAK_HISTORY = 4000;

export type DailyStreak = {
  count: number;
  recordedToday: boolean;
};

function historyKey(userId: string): string {
  return `gradient-descent:daily-streak:v1:${userId}:days`;
}

export function dayOrdinal(day: string): number | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(day);
  if (!match) return null;

  const year = Number(match[1]);
  const month = Number(match[2]);
  const date = Number(match[3]);
  const timestamp = Date.UTC(year, month - 1, date);
  const parsed = new Date(timestamp);
  if (
    parsed.getUTCFullYear() !== year ||
    parsed.getUTCMonth() !== month - 1 ||
    parsed.getUTCDate() !== date
  ) {
    return null;
  }

  return Math.floor(timestamp / DAY_MS);
}

// Daily levels roll at the player's local midnight, so a legitimate local day
// can be one date ahead of or behind the server's UTC date.
export function isCurrentLocalDay(day: string, now = new Date()): boolean {
  const ordinal = dayOrdinal(day);
  const utcToday = Math.floor(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()) /
      DAY_MS,
  );
  return ordinal !== null && Math.abs(ordinal - utcToday) <= 1;
}

export function countDailyStreak(
  playedDays: readonly string[],
  referenceDay: string,
): DailyStreak {
  const reference = dayOrdinal(referenceDay);
  if (reference === null) return { count: 0, recordedToday: false };

  const ordinals = [
    ...new Set(
      playedDays.flatMap((day) => {
        const ordinal = dayOrdinal(day);
        return ordinal === null || ordinal > reference ? [] : [ordinal];
      }),
    ),
  ].sort((a, b) => b - a);

  const latest = ordinals[0];
  const recordedToday = latest === reference;
  if (latest === undefined || latest < reference - 1) {
    return { count: 0, recordedToday };
  }

  let count = 1;
  for (let i = 1; i < ordinals.length; i += 1) {
    if (ordinals[i] !== latest - count) break;
    count += 1;
  }

  return { count, recordedToday };
}

export async function getDailyStreak(
  userId: string,
  referenceDay: string,
): Promise<DailyStreak> {
  const days = await redis.zRange(
    historyKey(userId),
    0,
    MAX_STREAK_HISTORY - 1,
    { by: 'rank', reverse: true },
  );
  return countDailyStreak(
    days.map(({ member }) => member),
    referenceDay,
  );
}

export async function recordDailyPlay(
  userId: string,
  day: string,
): Promise<DailyStreak> {
  const ordinal = dayOrdinal(day);
  if (ordinal === null) throw new Error('Invalid daily streak date');

  // The date is the sorted-set member, so replaying or retrying today's level
  // is idempotent and cannot increment the streak more than once.
  await redis.zAdd(historyKey(userId), { member: day, score: ordinal });
  return getDailyStreak(userId, day);
}
