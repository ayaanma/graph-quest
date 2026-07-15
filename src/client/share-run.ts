import { canRunAsUser, showToast } from '@devvit/web/client';

export type SharedRun = {
  gifDataUrl: string;
  levelId: string;
  levelLabel: string;
  equation: string;
  time: number;
};

type ShareResponse = {
  commentId: string;
  url: string;
  error?: string;
};

let shareEvent: Event | null = null;

window.addEventListener(
  'pointerup',
  (event) => {
    shareEvent = event;
    window.setTimeout(() => {
      if (shareEvent === event) shareEvent = null;
    }, 1500);
  },
  true,
);

async function authorize(): Promise<void> {
  const event = shareEvent;
  shareEvent = null;
  if (!event) throw new Error('Tap COMMENT GIF again to confirm the comment');

  const allowed = await canRunAsUser(event);
  if (!allowed) throw new Error('Reddit commenting permission is required');
}

async function comment(run: SharedRun): Promise<ShareResponse> {
  const response = await fetch('/api/share-run', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(run),
  });
  const body = (await response.json()) as ShareResponse;
  if (!response.ok) throw new Error(body.error ?? 'Could not comment this run');

  showToast({ text: 'Completed path commented!', appearance: 'success' });
  return body;
}

export const gradientDescentShare = { authorize, comment };

declare global {
  var GradientDescentShare: typeof gradientDescentShare | undefined;
}

globalThis.GradientDescentShare = gradientDescentShare;
