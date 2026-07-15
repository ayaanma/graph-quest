import { serve } from '@hono/node-server';
import {
  context,
  createServer,
  getServerPort,
  reddit,
} from '@devvit/web/server';
import type { UiResponse } from '@devvit/web/shared';
import { Hono } from 'hono';
import {
  getLeaderboard,
  isValidLevelId,
  normalizeRunInput,
  recordFirstRun,
} from './leaderboard.js';
import {
  asPostData,
  createCustomLevelPostData,
  normalizeCustomLevel,
  readCustomLevelPostData,
} from './custom-levels.js';
import {
  getDailyStreak,
  isCurrentLocalDay,
  recordDailyPlay,
} from './daily-streak.js';

const app = new Hono();

app.get('/api/health', (c) =>
  c.json({
    app: 'gradient-descent',
    ok: true,
  }),
);

app.get('/api/init', async (c) => {
  const username = await reddit.getCurrentUsername();
  const customLevelPost = readCustomLevelPostData(context.postData);

  return c.json({
    postId: context.postId ?? null,
    subredditName: context.subredditName ?? null,
    userId: context.userId ?? null,
    username: username ?? null,
    customLevel:
      customLevelPost && context.postId
        ? {
            postId: context.postId,
            author: customLevelPost.author,
            level: customLevelPost.level,
          }
        : null,
  });
});

app.get('/api/daily-streak', async (c) => {
  const day = c.req.query('day');
  if (!day || !isCurrentLocalDay(day)) {
    return c.json({ error: 'Invalid daily streak date' }, 400);
  }

  if (!context.userId) {
    return c.json({ count: 0, recordedToday: false, authenticated: false });
  }

  const streak = await getDailyStreak(context.userId, day);
  return c.json({ ...streak, authenticated: true });
});

app.post('/api/daily-streak', async (c) => {
  if (!context.userId) {
    return c.json({ error: 'Sign in to Reddit to track a daily streak' }, 401);
  }

  let body: unknown;
  try {
    body = await c.req.json();
  } catch {
    return c.json({ error: 'Request body must be valid JSON' }, 400);
  }

  const day =
    body && typeof body === 'object'
      ? (body as Record<string, unknown>).day
      : null;
  if (typeof day !== 'string' || !isCurrentLocalDay(day)) {
    return c.json({ error: 'Invalid daily streak date' }, 400);
  }

  const streak = await recordDailyPlay(context.userId, day);
  return c.json({ ...streak, authenticated: true });
});

app.post('/api/custom-levels', async (c) => {
  if (!context.userId) {
    return c.json({ error: 'Sign in to Reddit to publish a level' }, 401);
  }

  const username = await reddit.getCurrentUsername();
  const subredditName = context.subredditName;
  if (!username || !subredditName) {
    return c.json({ error: 'Reddit account or subreddit is unavailable' }, 401);
  }

  let body: unknown;
  try {
    body = await c.req.json();
  } catch {
    return c.json({ error: 'Request body must be valid JSON' }, 400);
  }

  const level = normalizeCustomLevel(body);
  if (!level) {
    return c.json({ error: 'Custom level data is invalid' }, 400);
  }

  const postData = createCustomLevelPostData(username, level);
  if (!postData) {
    return c.json({ error: 'This level is too large for a Reddit post' }, 400);
  }

  try {
    const post = await reddit.submitCustomPost({
      subredditName,
      title: `Gradient Descent — u/${username}'s custom level`,
      entry: 'default',
      runAs: 'USER',
      userGeneratedContent: {
        text: `A custom Gradient Descent level created by u/${username}.`,
      },
      postData: asPostData(postData),
      textFallback: {
        text: `A custom Gradient Descent function-graphing level created by u/${username}. Open this post in a supported Reddit client to play.`,
      },
      styles: {
        backgroundColor: '#070914FF',
        backgroundColorDark: '#070914FF',
        heightPixels: 320,
      },
    });

    return c.json({
      postId: post.id,
      url: `https://www.reddit.com${post.permalink}`,
    });
  } catch (error) {
    console.error('Failed to publish custom Gradient Descent level', error);
    return c.json({ error: 'Reddit could not publish this level' }, 400);
  }
});

app.get('/api/leaderboard/:levelId', async (c) => {
  const levelId = decodeURIComponent(c.req.param('levelId'));
  if (!isValidLevelId(levelId)) {
    return c.json({ error: 'Invalid level ID' }, 400);
  }

  const board = await getLeaderboard(levelId, context.userId ?? null);
  return c.json(board);
});

app.post('/api/leaderboard', async (c) => {
  if (!context.userId) {
    return c.json({ error: 'Sign in to Reddit to join the leaderboard' }, 401);
  }

  const username = await reddit.getCurrentUsername();
  if (!username) {
    return c.json({ error: 'Reddit username is unavailable' }, 401);
  }

  let body: unknown;
  try {
    body = await c.req.json();
  } catch {
    return c.json({ error: 'Request body must be valid JSON' }, 400);
  }

  const input = normalizeRunInput(body);
  if (!input) {
    return c.json({ error: 'Invalid leaderboard run' }, 400);
  }

  const { recorded, run } = await recordFirstRun({
    ...input,
    userId: context.userId,
    username,
  });
  const board = await getLeaderboard(input.levelId, context.userId);

  return c.json({
    ...board,
    recorded,
    playerRun: board.playerRun ?? {
      username: run.username,
      stars: run.stars,
      time: run.time,
      createdAt: run.createdAt,
      rank: 0,
      isPlayer: true,
    },
  });
});

app.post('/internal/menu/post-create', async (c) => {
  try {
    const post = await reddit.submitCustomPost({
      title: 'Gradient Descent — trace the function',
      entry: 'default',
      textFallback: {
        text: 'Gradient Descent is an interactive function-graphing puzzle. Open this post in a supported Reddit client to play.',
      },
      styles: {
        backgroundColor: '#070914FF',
        backgroundColorDark: '#070914FF',
        heightPixels: 320,
      },
    });

    return c.json<UiResponse>(
      {
        navigateTo: `https://reddit.com/r/${context.subredditName}/comments/${post.id}`,
      },
      200,
    );
  } catch (error) {
    console.error('Failed to create Gradient Descent post', error);

    return c.json<UiResponse>(
      {
        showToast: 'Failed to create Gradient Descent post',
      },
      400,
    );
  }
});

serve({
  fetch: app.fetch,
  createServer,
  port: getServerPort(),
});
