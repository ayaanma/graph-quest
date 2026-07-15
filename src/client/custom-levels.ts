import { canRunAsUser, navigateTo, showToast } from '@devvit/web/client';

export type CustomLevelData = {
  start: { x: number; y: number };
  goal: { x: number; y: number };
  obstacles: unknown[];
  stars: { x: number; y: number }[];
  solution: string;
};

export type PublishedCustomLevel = {
  postId: string;
  author: string;
  level: CustomLevelData;
};

type UploadResponse = {
  postId: string;
  url: string;
  error?: string;
};

let initialLevel: PublishedCustomLevel | null = null;
let uploadEvent: Event | null = null;

window.addEventListener(
  'pointerup',
  (event) => {
    uploadEvent = event;
    window.setTimeout(() => {
      if (uploadEvent === event) uploadEvent = null;
    }, 1500);
  },
  true,
);

async function upload(level: CustomLevelData): Promise<UploadResponse> {
  const event = uploadEvent;
  uploadEvent = null;
  if (!event) throw new Error('Tap UPLOAD again to confirm the Reddit post');

  const allowed = await canRunAsUser(event);
  if (!allowed) throw new Error('Reddit posting permission is required');

  const response = await fetch('/api/custom-levels', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(level),
  });
  const body = (await response.json()) as UploadResponse;
  if (!response.ok) throw new Error(body.error ?? 'Could not publish level');

  showToast({ text: 'Custom level posted!', appearance: 'success' });
  navigateTo(body.url);
  return body;
}

export const gradientDescentCustomLevels = {
  initial: (): PublishedCustomLevel | null => initialLevel,
  upload,
};

declare global {
  var GradientDescentCustomLevels:
    typeof gradientDescentCustomLevels | undefined;
}

export async function initializeCustomLevels(): Promise<void> {
  const response = await fetch('/api/init');
  if (!response.ok) return;
  const body = (await response.json()) as {
    customLevel?: PublishedCustomLevel | null;
  };
  initialLevel = body.customLevel ?? null;
}

globalThis.GradientDescentCustomLevels = gradientDescentCustomLevels;
