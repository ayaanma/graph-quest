import { redis } from '@devvit/web/server';

const CAMPAIGN_LEVEL_COUNT = 30;
const MAX_STARS = 3;
const MAX_CUSTOM_STARS = 10;
const MAX_TIME_SECONDS = 60 * 60;
const STAR_SCORE_OFFSET = 10_000;
const LEADERBOARD_SIZE = 100;

export type LeaderboardRun = {
  userId: string;
  username: string;
  levelId: string;
  stars: number;
  time: number;
  createdAt: string;
};

export type LeaderboardEntry = Omit<LeaderboardRun, 'userId' | 'levelId'> & {
  rank: number;
  isPlayer: boolean;
};

export type Leaderboard = {
  entries: LeaderboardEntry[];
  playerRun: LeaderboardEntry | null;
};

function recordsKey(levelId: string): string {
  return `gradient-descent:leaderboard:v1:${levelId}:runs`;
}

function rankingKey(levelId: string): string {
  return `gradient-descent:leaderboard:v1:${levelId}:ranking`;
}

function rankingScore(run: Pick<LeaderboardRun, 'stars' | 'time'>): number {
  return run.time - run.stars * STAR_SCORE_OFFSET;
}

function parseRun(value: string | undefined): LeaderboardRun | null {
  if (!value) return null;

  try {
    const run = JSON.parse(value) as Partial<LeaderboardRun>;
    if (
      typeof run.userId !== 'string' ||
      typeof run.username !== 'string' ||
      typeof run.levelId !== 'string' ||
      typeof run.stars !== 'number' ||
      typeof run.time !== 'number' ||
      typeof run.createdAt !== 'string'
    ) {
      return null;
    }

    return run as LeaderboardRun;
  } catch {
    return null;
  }
}

function toEntry(
  run: LeaderboardRun,
  rank: number,
  currentUserId: string | null,
): LeaderboardEntry {
  return {
    username: run.username,
    stars: run.stars,
    time: run.time,
    createdAt: run.createdAt,
    rank,
    isPlayer: run.userId === currentUserId,
  };
}

export function isValidLevelId(levelId: unknown): levelId is string {
  if (typeof levelId !== 'string') return false;

  if (/^custom:t3_[a-z0-9]+$/i.test(levelId)) return true;

  const campaign = /^l([1-9]|[12]\d|30)$/.exec(levelId);
  if (campaign) return Number(campaign[1]) <= CAMPAIGN_LEVEL_COUNT;

  const daily = /^daily:(\d{4})-(\d{2})-(\d{2})$/.exec(levelId);
  if (!daily) return false;

  const year = Number(daily[1]);
  const month = Number(daily[2]);
  const day = Number(daily[3]);
  const date = new Date(Date.UTC(year, month - 1, day));
  return (
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day
  );
}

export function normalizeRunInput(input: unknown): {
  levelId: string;
  stars: number;
  time: number;
} | null {
  if (!input || typeof input !== 'object') return null;

  const { levelId, stars, time } = input as Record<string, unknown>;
  const maxStars =
    typeof levelId === 'string' && levelId.startsWith('custom:')
      ? MAX_CUSTOM_STARS
      : MAX_STARS;
  if (
    !isValidLevelId(levelId) ||
    typeof stars !== 'number' ||
    !Number.isInteger(stars) ||
    stars < 0 ||
    stars > maxStars ||
    typeof time !== 'number' ||
    !Number.isFinite(time) ||
    time <= 0 ||
    time > MAX_TIME_SECONDS
  ) {
    return null;
  }

  return {
    levelId,
    stars,
    time: Math.round(time * 10) / 10,
  };
}

export async function recordFirstRun(input: {
  userId: string;
  username: string;
  levelId: string;
  stars: number;
  time: number;
}): Promise<{ run: LeaderboardRun; recorded: boolean }> {
  const candidate: LeaderboardRun = {
    ...input,
    createdAt: new Date().toISOString(),
  };
  const runKey = recordsKey(input.levelId);
  const rankKey = rankingKey(input.levelId);
  const inserted = await redis.hSetNX(
    runKey,
    input.userId,
    JSON.stringify(candidate),
  );

  const stored = inserted
    ? candidate
    : parseRun(await redis.hGet(runKey, input.userId));

  if (!stored) {
    throw new Error('Leaderboard record could not be read after submission');
  }

  // zAdd is idempotent. Re-adding the immutable stored score also repairs the
  // unlikely case where record creation succeeded but indexing was interrupted.
  await redis.zAdd(rankKey, {
    member: stored.userId,
    score: rankingScore(stored),
  });

  return { run: stored, recorded: inserted === 1 };
}

export async function getLeaderboard(
  levelId: string,
  currentUserId: string | null,
): Promise<Leaderboard> {
  const runKey = recordsKey(levelId);
  const rankKey = rankingKey(levelId);
  const ranked = await redis.zRange(rankKey, 0, LEADERBOARD_SIZE - 1, {
    by: 'rank',
  });
  const userIds = ranked.map(({ member }) => member);
  const serializedRuns = userIds.length
    ? await redis.hMGet(runKey, userIds)
    : [];
  const entries = serializedRuns.flatMap((value, index) => {
    const run = parseRun(value ?? undefined);
    return run ? [toEntry(run, index + 1, currentUserId)] : [];
  });

  let playerRun = entries.find(({ isPlayer }) => isPlayer) ?? null;
  if (!playerRun && currentUserId) {
    const [serializedPlayerRun, playerRank] = await Promise.all([
      redis.hGet(runKey, currentUserId),
      redis.zRank(rankKey, currentUserId),
    ]);
    const run = parseRun(serializedPlayerRun);
    if (run && playerRank !== undefined) {
      playerRun = toEntry(run, playerRank + 1, currentUserId);
    }
  }

  return { entries, playerRun };
}
