import type { JsonObject } from '@devvit/shared-types/json.js';

const X_MIN = -10;
const X_MAX = 10;
const Y_MIN = -8;
const Y_MAX = 8;
const MAX_OBSTACLES = 12;
const MAX_STARS = 10;
const MAX_SOLUTION_LENGTH = 96;
const MAX_POST_DATA_BYTES = 2048;

type Point = { x: number; y: number };

type RectObstacle = {
  kind: 'rect';
  x0: number;
  y0: number;
  x1: number;
  y1: number;
};

type CircleObstacle = {
  kind: 'circle';
  center: Point;
  radius: number;
};

type TriangleObstacle = {
  kind: 'triangle';
  vertices: [Point, Point, Point];
};

export type CustomLevelData = {
  start: Point;
  goal: Point;
  obstacles: (RectObstacle | CircleObstacle | TriangleObstacle)[];
  stars: Point[];
  solution: string;
};

export type CustomLevelPostData = {
  type: 'gradient-descent-custom-level';
  version: 1;
  author: string;
  level: CustomLevelData;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function numberInRange(
  value: unknown,
  min: number,
  max: number,
): value is number {
  return (
    typeof value === 'number' &&
    Number.isFinite(value) &&
    value >= min &&
    value <= max
  );
}

function normalizeNumber(value: number): number {
  return Number(value.toFixed(3));
}

function normalizePoint(value: unknown): Point | null {
  if (
    !isRecord(value) ||
    !numberInRange(value.x, X_MIN, X_MAX) ||
    !numberInRange(value.y, Y_MIN, Y_MAX)
  ) {
    return null;
  }

  return { x: normalizeNumber(value.x), y: normalizeNumber(value.y) };
}

function normalizeObstacle(
  value: unknown,
): RectObstacle | CircleObstacle | TriangleObstacle | null {
  if (!isRecord(value)) return null;

  if (value.kind === 'rect') {
    if (
      !numberInRange(value.x0, X_MIN, X_MAX) ||
      !numberInRange(value.y0, Y_MIN, Y_MAX) ||
      !numberInRange(value.x1, X_MIN, X_MAX) ||
      !numberInRange(value.y1, Y_MIN, Y_MAX) ||
      value.x1 - value.x0 <= 0.1 ||
      value.y1 - value.y0 <= 0.1
    ) {
      return null;
    }

    return {
      kind: 'rect',
      x0: normalizeNumber(value.x0),
      y0: normalizeNumber(value.y0),
      x1: normalizeNumber(value.x1),
      y1: normalizeNumber(value.y1),
    };
  }

  if (value.kind === 'circle') {
    const center = normalizePoint(value.center);
    if (!center || !numberInRange(value.radius, 0.101, 20)) return null;
    return {
      kind: 'circle',
      center,
      radius: normalizeNumber(value.radius),
    };
  }

  if (value.kind === 'triangle') {
    if (!Array.isArray(value.vertices) || value.vertices.length !== 3) {
      return null;
    }
    const points = value.vertices.map(normalizePoint);
    if (points.some((point) => point === null)) return null;
    const [a, b, c] = points as [Point, Point, Point];
    const area2 = Math.abs(
      (b.x - a.x) * (c.y - a.y) - (b.y - a.y) * (c.x - a.x),
    );
    if (area2 <= 0.02) return null;
    return { kind: 'triangle', vertices: [a, b, c] };
  }

  return null;
}

export function normalizeCustomLevel(input: unknown): CustomLevelData | null {
  if (!isRecord(input)) return null;

  const start = normalizePoint(input.start);
  const goal = normalizePoint(input.goal);
  if (!start || !goal || goal.x <= start.x) return null;

  if (
    !Array.isArray(input.obstacles) ||
    input.obstacles.length > MAX_OBSTACLES ||
    !Array.isArray(input.stars) ||
    input.stars.length < 1 ||
    input.stars.length > MAX_STARS ||
    typeof input.solution !== 'string'
  ) {
    return null;
  }

  const solution = input.solution.trim();
  if (
    solution.length < 1 ||
    solution.length > MAX_SOLUTION_LENGTH ||
    !/^[0-9a-z+\-*/^()., ]+$/i.test(solution)
  ) {
    return null;
  }

  const obstacles = input.obstacles.map(normalizeObstacle);
  const stars = input.stars.map(normalizePoint);
  if (
    obstacles.some((obstacle) => obstacle === null) ||
    stars.some((star) => star === null)
  ) {
    return null;
  }

  return {
    start,
    goal,
    obstacles: obstacles as CustomLevelData['obstacles'],
    stars: stars as Point[],
    solution,
  };
}

export function createCustomLevelPostData(
  author: string,
  level: CustomLevelData,
): CustomLevelPostData | null {
  const postData: CustomLevelPostData = {
    type: 'gradient-descent-custom-level',
    version: 1,
    author,
    level,
  };

  return Buffer.byteLength(JSON.stringify(postData), 'utf8') <=
    MAX_POST_DATA_BYTES
    ? postData
    : null;
}

export function readCustomLevelPostData(
  value: unknown,
): CustomLevelPostData | null {
  if (
    !isRecord(value) ||
    value.type !== 'gradient-descent-custom-level' ||
    value.version !== 1 ||
    typeof value.author !== 'string' ||
    !/^[A-Za-z0-9_-]{3,32}$/.test(value.author)
  ) {
    return null;
  }

  const level = normalizeCustomLevel(value.level);
  return level
    ? {
        type: 'gradient-descent-custom-level',
        version: 1,
        author: value.author,
        level,
      }
    : null;
}

export function asPostData(value: CustomLevelPostData): JsonObject {
  return value as unknown as JsonObject;
}
