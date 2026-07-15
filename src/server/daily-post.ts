import type { T3 } from '@devvit/shared-types/tid.js';
import { reddit, redis } from '@devvit/web/server';

const DAY_MS = 86_400_000;
export const DAILY_CONCEPTION_DAY = '2026-07-14';
const POSTS_KEY = 'gradient-descent:daily-posts:v1';
const CURRENT_POST_KEY = 'gradient-descent:daily-post:current:v1';

export function utcDayKey(now = new Date()): string {
  return now.toISOString().slice(0, 10);
}

export function dailyNumber(day: string): number {
  const timestamp = Date.parse(`${day}T00:00:00.000Z`);
  const conception = Date.parse(`${DAILY_CONCEPTION_DAY}T00:00:00.000Z`);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(day) || !Number.isFinite(timestamp)) {
    throw new Error('Daily date must be YYYY-MM-DD');
  }
  const count = Math.floor((timestamp - conception) / DAY_MS) + 1;
  if (count < 1) throw new Error('Daily date predates conception');
  return count;
}

async function pinAsCurrent(postId: T3): Promise<void> {
  const previous = await redis.get(CURRENT_POST_KEY);
  const post = await reddit.getPostById(postId);
  await post.sticky(1);
  await redis.set(CURRENT_POST_KEY, postId);
  if (previous && previous !== postId) {
    await reddit
      .getPostById(previous as T3)
      .then((old) => old.unsticky())
      .catch(() => undefined);
  }
}

export async function publishUtcDaily(
  subredditName: string,
  now = new Date(),
): Promise<T3> {
  const day = utcDayKey(now);
  const existing = await redis.hGet(POSTS_KEY, day);
  if (existing) {
    await pinAsCurrent(existing as T3);
    return existing as T3;
  }

  const lockKey = `gradient-descent:daily-post:lock:${day}`;
  const lock = await redis.set(lockKey, '1', {
    nx: true,
    expiration: new Date(Date.now() + 5 * 60 * 1000),
  });
  if (!lock) {
    const winner = await redis.hGet(POSTS_KEY, day);
    if (winner) return winner as T3;
    throw new Error(`Daily ${day} is already being published`);
  }

  try {
    const post = await reddit.submitCustomPost({
      subredditName,
      title: `Daily #${dailyNumber(day)} - ${day}`,
      entry: 'default',
      postData: { kind: 'daily', day },
      textFallback: {
        text: `Play the Gradient Descent daily challenge for ${day} (UTC). Open this post in a supported Reddit client to play.`,
      },
      styles: {
        backgroundColor: '#070914FF',
        backgroundColorDark: '#070914FF',
        heightPixels: 320,
      },
    });

    await redis.hSet(POSTS_KEY, { [day]: post.id });
    await pinAsCurrent(post.id);
    return post.id;
  } finally {
    await redis.del(lockKey);
  }
}
