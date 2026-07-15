import { RichTextBuilder } from '@devvit/reddit';
import type { T1, T3 } from '@devvit/shared-types/tid.js';
import { media, reddit, redis } from '@devvit/web/server';

const MAX_GIF_BYTES = 2_800_000;
const SHARE_ANCHORS_KEY = 'gradient-descent:share-anchors:v1';
const FUNCTION_RE = /^[0-9a-z+\-*/^()., ]{1,256}$/i;
const LEVEL_ID_RE =
  /^(?:l(?:[1-9]|[12]\d|30)|daily:\d{4}-\d{2}-\d{2}|custom:t3_[a-z0-9]+)$/i;

export type ShareRunInput = {
  gifDataUrl: string;
  levelId: string;
  levelLabel: string;
  equation: string;
  time: number;
};

function cleanLabel(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const label = value.trim();
  return label.length >= 1 &&
    label.length <= 80 &&
    !/[\r\n\u0000-\u001f]/.test(label)
    ? label
    : null;
}

export function normalizeShareRun(input: unknown): ShareRunInput | null {
  if (!input || typeof input !== 'object') return null;
  const value = input as Record<string, unknown>;
  const levelLabel = cleanLabel(value.levelLabel);
  const equation =
    typeof value.equation === 'string' ? value.equation.trim() : '';
  const time = typeof value.time === 'number' ? value.time : Number.NaN;

  if (
    typeof value.gifDataUrl !== 'string' ||
    typeof value.levelId !== 'string' ||
    !LEVEL_ID_RE.test(value.levelId) ||
    !levelLabel ||
    !FUNCTION_RE.test(equation) ||
    !Number.isFinite(time) ||
    time <= 0 ||
    time > 60 * 60
  ) {
    return null;
  }

  const match = /^data:image\/gif;base64,([A-Za-z0-9+/]+={0,2})$/.exec(
    value.gifDataUrl,
  );
  if (!match) return null;

  const bytes = Buffer.from(match[1], 'base64');
  if (
    bytes.length < 14 ||
    bytes.length > MAX_GIF_BYTES ||
    bytes.subarray(0, 6).toString('ascii') !== 'GIF89a' ||
    bytes[bytes.length - 1] !== 0x3b
  ) {
    return null;
  }

  return {
    gifDataUrl: value.gifDataUrl,
    levelId: value.levelId,
    levelLabel,
    equation,
    time: Math.round(time * 10) / 10,
  };
}

async function ensureShareAnchor(postId: T3): Promise<T1> {
  const stored = await redis.hGet(SHARE_ANCHORS_KEY, postId);
  if (stored && /^t1_[a-z0-9]+$/i.test(stored)) return stored as T1;

  const anchor = await reddit.submitComment({
    id: postId,
    text: 'Gradient Descent completed runs — expand the replies to see solved functions and animated paths.',
    runAs: 'APP',
  });

  const inserted = await redis.hSetNX(SHARE_ANCHORS_KEY, postId, anchor.id);
  if (inserted === 1) {
    try {
      await anchor.distinguish(true);
      return anchor.id;
    } catch (error) {
      await Promise.all([
        redis.hDel(SHARE_ANCHORS_KEY, [postId]),
        anchor.delete().catch(() => undefined),
      ]);
      throw error;
    }
  }

  const winner = await redis.hGet(SHARE_ANCHORS_KEY, postId);
  if (winner && /^t1_[a-z0-9]+$/i.test(winner)) {
    await anchor.delete().catch(() => undefined);
    return winner as T1;
  }

  return anchor.id;
}

export async function commentSharedRun(
  postId: T3,
  input: ShareRunInput,
): Promise<{ commentId: string; url: string }> {
  const [anchorId, uploaded] = await Promise.all([
    ensureShareAnchor(postId),
    media.upload({ url: input.gifDataUrl, type: 'gif' }),
  ]);
  const richtext = new RichTextBuilder()
    .paragraph((paragraph) => {
      paragraph.text({
        text: `I cleared Gradient Descent — ${input.levelLabel} with f(x) = ${input.equation}.`,
      });
    })
    .animatedImage({
      mediaUrl: uploaded.mediaUrl,
      caption: `${input.levelLabel} completed path`,
    });
  const comment = await reddit.submitComment({
    id: anchorId,
    richtext,
    runAs: 'USER',
  });

  return {
    commentId: comment.id,
    url: `https://www.reddit.com${comment.permalink}`,
  };
}
