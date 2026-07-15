export type DailyStreakResponse = {
  count: number;
  recordedToday: boolean;
  authenticated: boolean;
};

async function requestDailyStreak(
  day: string,
  record: boolean,
): Promise<DailyStreakResponse> {
  const response = await fetch(
    record
      ? '/api/daily-streak'
      : `/api/daily-streak?day=${encodeURIComponent(day)}`,
    record
      ? {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ day }),
        }
      : undefined,
  );
  const body = (await response.json()) as DailyStreakResponse & {
    error?: string;
  };

  if (!response.ok) {
    throw new Error(body.error ?? 'Daily streak request failed');
  }

  return body;
}

export const gradientDescentDailyStreak = {
  get: (day: string) => requestDailyStreak(day, false),
  record: (day: string) => requestDailyStreak(day, true),
};

declare global {
  var GradientDescentDailyStreak: typeof gradientDescentDailyStreak | undefined;
}

globalThis.GradientDescentDailyStreak = gradientDescentDailyStreak;
