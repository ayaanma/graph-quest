import { serve } from '@hono/node-server';
import {
  context,
  createServer,
  getServerPort,
  reddit,
} from '@devvit/web/server';
import type { UiResponse } from '@devvit/web/shared';
import { Hono } from 'hono';

const app = new Hono();

app.get('/api/health', (c) =>
  c.json({
    app: 'gradient-descent',
    ok: true,
  }),
);

app.get('/api/init', async (c) => {
  const username = await reddit.getCurrentUsername();

  return c.json({
    postId: context.postId ?? null,
    subredditName: context.subredditName ?? null,
    userId: context.userId ?? null,
    username: username ?? null,
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
