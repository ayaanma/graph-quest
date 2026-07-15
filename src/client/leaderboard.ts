export type LeaderboardEntry = {
  username: string;
  stars: number;
  time: number;
  createdAt: string;
  rank: number;
  isPlayer: boolean;
};

export type LeaderboardResponse = {
  entries: LeaderboardEntry[];
  playerRun: LeaderboardEntry | null;
  recorded?: boolean;
};

type RunInput = {
  levelId: string;
  stars: number;
  time: number;
};

async function requestLeaderboard(
  input: string | RunInput,
): Promise<LeaderboardResponse> {
  const submitting = typeof input !== 'string';
  const response = await fetch(
    submitting
      ? '/api/leaderboard'
      : `/api/leaderboard/${encodeURIComponent(input)}`,
    submitting
      ? {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify(input),
        }
      : undefined,
  );
  const body = (await response.json()) as LeaderboardResponse & {
    error?: string;
  };

  if (!response.ok) {
    throw new Error(body.error ?? 'Leaderboard request failed');
  }

  return body;
}

export const gradientDescentLeaderboard = {
  get: (levelId: string) => requestLeaderboard(levelId),
  submit: (run: RunInput) => requestLeaderboard(run),
};

declare global {
  var GradientDescentLeaderboard: typeof gradientDescentLeaderboard | undefined;
}

globalThis.GradientDescentLeaderboard = gradientDescentLeaderboard;
