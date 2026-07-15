# Gradient Descent — Agent Handoff

_Last updated: 2026-07-15 · Published version: **38** · Phaser project id: `RjzqGQux4x1`_

## TL;DR — read this first

**This local folder is a DEVVIT WEB WRAPPER around a built export, not the gameplay source of truth.**
`src/client/public/content.js` is a minified esbuild bundle and `src/client/public/levels.js` is generated data. **Do not edit them** — changes there do nothing to the real game. Devvit configuration and server code in this repository are editable normally.

The **real, editable TypeScript source lives in the Phaser Game Agent cloud sandbox**, project `RjzqGQux4x1`, owned by the user's Phaser account (user `maatm`). You reach it through the **`phaser-game-agent` MCP tools**, never through the local filesystem.

Gradient Descent is a synthwave function-graphing puzzle: the player writes `f(x)`, and a ship traces the curve `g(x) = f(x) - f(x_start) + y_start` across a tilted 2.5D Cartesian grid, dodging rectangular obstacles, threading stars, and reaching a goal.

## How to work on it (the MCP workflow)

All tools are prefixed `mcp__phaser-game-agent__phaser_game_agent_*` (some are deferred — load schemas with ToolSearch `select:<name>` first).

1. **`open_project`** with `projectId: "RjzqGQux4x1"` — always first (resumes the paused sandbox).
2. **`snapshot`** with a label before any big/risky change (keeps newest 5; restore with `restore`).
3. **`read_files`** / **`grep`** / **`ls`** to explore. ⚠️ `read_files` fails if the batch is too large — read big files (e.g. `play.ts` ~34KB) one at a time.
4. **`write_files`** to author. ⚠️ **This overwrites the ENTIRE file** — there is no partial-edit tool for the sandbox. You must supply full file contents. Read the file first, modify, write it whole.
5. **`verify`** — runs `tsc` (type-check) + `src/verify.ts` acceptance tests. Must be `ok: true` before publishing. Currently **236 tests pass, 0 fail**.
6. **`preview`** with a `changes:` note — builds + publishes a new version to the user's Phaser account, returns the play URL.
7. **`finish`** — pauses the sandbox to stop billing (auto-resumes on next call). Call it when done each session.

**Play URL:** https://phaser.io/agent/local/RjzqGQux4x1
**Credits:** 235 remaining (v38 left 308; a read-only session for the splash restyle used ~73). `finish` has paused the workspace and stopped idle billing.

Engine docs live in the sandbox at `engine/raster/*.md` + `*.d.ts` — **reference only, never edit** `engine/`. Start with `engine/raster/index.md`, then per-topic docs (`input.md`, `particles.md`, etc.).

## Devvit Web wrapper

- `src/client/index.html` + `src/client/public/content.js` are the deployed browser game. The bundle lives under `public/` so Vite copies the generated file without rewriting it.
- `src/client/splash.html` is the launch/custom-post splash (its own `devvit.json` entrypoint). For custom-level posts it fetches `/api/init` and draws the authored course in the game's own pixel-art style, and its `<author>'s Level` title uses the `game-font.png` bitmap font — see "Devvit wrapper edits since v38".
- `src/client/public/assets/` and `src/client/public/levels.js` are copied unchanged into the client build.
- `src/server/index.ts` hosts Devvit API and moderator post-creation endpoints.
- `src/client/share-run.ts` requests run-as-user comment consent from the trusted completion-button tap; `src/server/share-run.ts` validates the generated GIF, uploads it to Reddit media, and submits the rich-text run comment beneath a single stickied share anchor.
- `devvit.json` defines the custom-post entrypoint and moderator menu action.
- `npm run check` type-checks, formats-checks, and builds; `npm run dev` starts a Reddit playtest; `npm run deploy` uploads a private build; `npm run launch` submits it for review.
- Before first-time registration, `devvit.json` intentionally uses the official `<% name %>` placeholder. Run `npx devvit init` without `--force`, request `gradient-descent` if available, and let the CLI synchronize the registered slug into `devvit.json` and `package.json`.

## Source layout (in the sandbox, under `src/`)

```
game.ts            scene roster + boot: { title, play, gameOver, levelSelect, editor }
game.json          resolution preset (custom 384x288, 4:3, pixel) — single source of truth for canvas
config.ts          ALL constants + the COL palette (see "Key constants" below)
verify.ts          acceptance tests (type-check + runtime asserts)
logic/
  parser.ts        safe recursive-descent compiler for f(x) — NO eval; whitelisted grammar
  trace.ts         computeTrace(fn, level): offset curve walk + sample/segment collision
  projection.ts    worldToScreen(x,y)  AND  screenToWorld(sx,sy) (exact inverse, added for editor)
  levels.ts        Level interface + 30-level campaign (3 crafted l1-l3 + 27 authored l4-l30)
  daily.ts         local calendar day key + seeded solution-first daily generator + run selector
  gif.ts           dependency-free GIF89a encoder + 3-3-2 color quantizer for solved-run exports
  textbox.ts       fixed-font text measurement + safe dynamic transient-message boxes
  leaderboard.ts   Devvit host adapter + standalone fallback + stars-first/time-second ranking
  blocks.ts        block-mode term catalogue -> expression
  scoring.ts       formatTime + score formula
  store.ts         persistence abstraction (mute, progress, best times/stars)
scenes/
  title.ts         main menu — PLAY / LEVEL SELECT / LEVEL EDITOR buttons + mute
  play.ts          the main gameplay scene (the big one, ~34KB)
  editor.ts        ★ the Level Editor (custom role 'editor') — most recent work
  levelselect.ts   level grid
  gameover.ts      win screen
  backdrop.ts      makeSky / drawNebula / drawPlanet helpers
  ship.ts          ★ shared neon player-ship glyph: drawShip(r,ctx,cx,cy,angle,t)
spec/
  manifest.md      design doc — KEEP IN SYNC when you change mechanics
  style.md         art/tone guide
  signoff.md       (unused/placeholder)
```

★ = added during the level-editor work described below.

## What was built recently (versions 12–38)

Earlier (v12): ported three feature commits from the local build into the TS source — a moving spaceship trace head, the 30-level campaign, and physical-keyboard input in Advanced mode.

**The Level Editor (v13–v15)** — a `create-your-own-level` scene reached from the title screen. Current behavior:

- **Scene:** `src/scenes/editor.ts`, registered as role `editor` in `game.ts`; reached via `this.game.goto('editor')` from the Title `LEVEL EDITOR` button.
- **Two-tab panel:** `TOOLS` (placement) and `FUNCTION` (type `f(x)`), mirroring Play's BLOCKS/TYPE tabs.
- **Tools:** `START` / `GOAL` (one tap moves), `WALL` (tap two corners → rectangle, live rubber-band preview), `STAR` (one tap), `ERASE` (tap a wall/star to delete).
- **Coordinate mapping:** taps → world via `screenToWorld` (exact inverse of `worldToScreen`; round-trip asserted in `verify.ts`). **Every placed coordinate snaps to 3 decimals** (`Number(v.toFixed(3))`), matching the campaign data format.
- **Wall guard:** a wall may not cover the start pad, goal, or any star (checked against each anchor's tolerance radius — `GOAL_TOL` 0.4 / `STAR_TOL` 0.3). Blocked drops turn the preview red and are refused with an error buzz.
- **LAUNCH (test-fly):** builds a transient `Level` from the current placement and runs the real `computeTrace`, animating the shared ship, popping stars, reporting goal/fail via a toast. Present in **both** tabs — small button bottom-left in TOOLS, tall button on the right in FUNCTION (matching Play's LAUNCH position).
- **UPLOAD:** stays dim/locked until a LAUNCH fly reaches the goal collecting **all** stars (`completed` flag), with at least one star required. On a full-star clear it lights up (cyan glow + pulse). **Any edit re-locks it** (`completed = false` on every mutation). In Reddit, tapping it requests run-as-user consent and publishes the snapped course as a custom post owned by that user.
- **Cursor coordinate readout** centered at the top of the screen while hovering the grid.

**Per-level leaderboards (v16)** — the Level-Clear overlay was reflowed upward to make room for a synthwave-styled, clipped leaderboard below the clear stats.

- `src/logic/leaderboard.ts` deterministically generates 20 fictional `u/...` Reddit-style users per level and inserts the current run as highlighted `u/you`.
- Ranking is stars descending, then time ascending. Stars are deliberately the primary key, so one extra star outweighs any time advantage.
- The list supports touch/mouse drag, mouse wheel, and compact up/down controls. RETRY / NEXT / SHARE remain fixed below it.
- This is prototype data only; a real Devvit leaderboard should preserve the module boundary and replace generation with Redis-backed per-user/per-level records.

**Local-time Daily Challenge (v17, corrected in v18)** — a highlighted `DAILY · MM-DD` entry on the title screen launches a deterministic, solution-first daily course through the normal Play scene.

- `src/logic/daily.ts` hashes `YYYY-MM-DD` with FNV-1a, feeds a deterministic PRNG, authors a valid expression/path first, samples three stars on that path, and places seeded hazards outside a collision-safe corridor.
- The date key uses the player's browser-local `getFullYear()` / `getMonth()` / `getDate()` values and rolls at local midnight. It is frozen when the run starts, so crossing midnight cannot change a level mid-attempt. Daily play does not overwrite campaign progress.
- Daily runs reuse the complete Blocks/Type editor, trace animation, scoring, retry, hint, share, best-time persistence, and leaderboard overlay. Daily ids/boards are namespaced as `daily:YYYY-MM-DD`; share text includes the local calendar date.
- The daily clear overlay says `DAILY CLEAR`; RETRY keeps the frozen seed and the primary exit returns to TITLE.
- Verification covers the exact 00:00Z rollover, deterministic same-day output, adjacent-day variation, leaderboard time bounds, and an entire leap-year corpus (366 generated levels must compile, reach the goal, collect every star, and produce >350 distinct layouts).
- The board still uses deterministic prototype Reddit handles. In a production Devvit Web host, keep the client's local date key, resolve the username server-side, and replace the leaderboard adapter with Redis sorted sets keyed by the same daily id.

**Solved-run GIF export (v19, cleaned up in v20–v21)** — the Level-Clear overlay now has an `EXPORT AS GIF` button beside `SHARE FUNCTION`.

- Export recompiles the stored winning equation and visibly replays the already-validated path; it does not create a new attempt, rewrite progress, or post another leaderboard result.
- The downloadable looping GIF is 384×218 at 10 fps with a 0.8-second final hold. It captures a simplified level/final-time header, graph, obstacles, stars, target, moving ship/trace, and a dedicated `f(x)` strip while excluding the input controls and all interactive HUD icons.
- `src/logic/gif.ts` contains a dependency-free GIF89a/LZW encoder with fixed 3-3-2 color quantization. Verification asserts its header/dimensions/trailer; an ImageMagick decode also validated a representative 24-frame output.
- The exported header displays the recorded final time for the entire replay at the true top-right edge; it does not count upward. Campaign and Daily runs use the same exporter and produce sanitized filenames from the level id.
- In v21 the complete overlay (title, time/stars/best, leaderboard, scroll controls, action buttons, hit targets, and feedback banner) moved down 12px as a unit, retaining all prior spacing.
- Transient message boxes in Play, Editor, and Level Select now measure the actual 8×8 bitmap-font width, add 8px horizontal padding, expand up to the 376px safe width, and truncate only at that hard limit. The editor's `Can't cover start, goal, or a star` warning now gets a 288px box instead of overflowing a fixed banner.

**Gradient Descent rename (v27)** — renamed the published game, generated a matching synthwave title logo, and updated active source/spec branding, share text, leaderboard label, GIF filenames, deterministic namespaces, and persistence keys. The local built export remains generated and should not be hand-edited.

**Title-logo style match (v29)** — regenerated the `Gradient Descent` lettering through Phaser, then fitted the generated pixels into the original 640×159 one-line title lockup with nearest-neighbor scaling. The menu retains its original position, footprint, chunky 16-bit treatment, dark indigo edge, and vertical cyan/white/magenta band.

**Slightly wider title (v30)** — widened the fitted title lettering by about 2.5% inside the same 640×159 asset canvas. Height, center point, pixel treatment, tagline clearance, and menu layout are unchanged.

**10% wider title (v31)** — widened the v30 title exactly 10% to a 704×159 asset and recentered its unchanged 0.34-scale draw at x=72.32. The logo height, subtitle clearance, and menu controls remain unchanged.

**Real Reddit leaderboards (v32)** — replaced the fictional board generator with a Devvit Web host bridge backed by Redis.

- The server resolves identity from the authenticated Reddit context; clients never submit a username or user id.
- Each campaign or daily board stores exactly one immutable first completion per Reddit account using atomic `hSetNX`, then indexes that stored run in a Redis sorted set. Retrying cannot replace the original time, stars, or rank.
- Ranking remains stars descending, then time ascending. The top 100 and the current player's true rank are returned, including when that player is outside the first page.
- The completion overlay shows the current run immediately, asynchronously replaces it with canonical server data, labels synchronization, ignores stale responses after retry/navigation, and reports when the first run was retained.
- Standalone Phaser previews use only the current player's row; no fictional Reddit accounts are displayed. Verification includes the host contract and immutable-first-run response behavior.

**Custom-level Reddit posts (v33)** — completed the Level Editor upload path across Phaser and Devvit Web.

- The editor serializes start/goal points, rectangle/circle/triangle obstacles, 1–10 stars, and the author-cleared solution. It caps courses at 12 walls and 96 function characters so valid drafts fit Reddit's 2 KB `postData` limit.
- The Devvit client requests Reddit's run-as-user consent from the trusted UPLOAD tap. `devvit.json` declares `permissions.reddit.asUser: ["SUBMIT_POST"]`; without that exact scope Devvit returns `false` without showing a prompt. The server revalidates every field, submits the custom post with `runAs: 'USER'`, and records the authenticated username as author metadata.
- Opening a custom-level post exposes its `postData` through `/api/init`, and Play loads the authored course with custom clear/share chrome.
- Custom completions use Redis leaderboards namespaced by `custom:<postId>`, preventing records from different authored posts from mixing.
- The verified v33 bundle is synced to `src/client/public/content.js`. Phaser verification passes 229 tests; the Devvit wrapper passes type-check, formatting, and production build.

**Custom-post direct entry and preview (v34)** — made authored-level posts feel like the level itself instead of a generic game entrypoint.

- Custom posts skip the Phaser title menu and transition directly into the authored level.
- The in-game heading is exactly `<Reddit username>'s Level`; the `DAILY` prefix remains reserved for actual daily challenges.
- The Devvit splash fetches `/api/init` and, for custom posts, draws the level's start, goal, walls, and stars below the title and above the `Play level` button. Non-custom posts retain the generic splash.
- The verified v34 bundle is synced to `src/client/public/content.js`. Phaser verification passes 229 tests; the Devvit wrapper passes type-check, formatting, and production build.

**Returnable custom-level navigation (v35)** — kept automatic custom-level entry without trapping the player in a redirect loop.

- A custom post consumes its automatic redirect only once per page load. The first Title setup still opens the authored course immediately.
- The Play hamburger and the completion overlay's `TITLE` button now land on and remain at the title menu. `PLAY CUSTOM LEVEL` starts the authored course again on demand.
- The verified v35 bundle is synced to `src/client/public/content.js`. Phaser verification passes 231 tests; the Devvit wrapper passes type-check, formatting, and production build.

**Splash/menu visual parity and title reliability (v36)** — aligned the Devvit entry splash with the procedural title scene and repaired the missing in-game title.

- The splash now renders the menu's deep-indigo gradient, three-layer starfield, two drifting nebula puffs, and small planet instead of its separate graph/trajectory background. It uses the exact in-game bitmap font and the logo has no splash-only glow.
- The title scene initializes its logo texture before the custom-post auto-redirect, so returning to `TITLE` cannot encounter an uninitialized title texture. The exact logo was re-uploaded as a fresh Phaser-library asset to avoid a stale runtime object.
- The verified v36 bundle is synced to `src/client/public/content.js`. Phaser verification passes 231 tests; the Devvit wrapper passes type-check, formatting, and production build.

**Authenticated daily-play streaks (v37)** — added a Redis-backed consecutive-day counter that advances only when a signed-in Reddit user enters the Daily Challenge.

- Each user gets an idempotent Redis sorted-set history keyed by local `YYYY-MM-DD`, so retries and repeat taps cannot increment the same day twice. The active streak is the consecutive run ending today or yesterday; missing a full local day resets the displayed count.
- The server accepts only valid local dates within one day of UTC, resolving identity exclusively from authenticated Devvit context. Campaign, custom, editor, and ordinary title visits never write streak data.
- The highlighted Daily title button is widened to contain a multi-tone, integer-aligned pixel flame to the right of the date. The canonical count is rendered inside it with the same bitmap font as the rest of the UI.
- The verified v37 bundle is synced to `src/client/public/content.js`. Phaser verification passes 233 tests; the Devvit wrapper passes type-check, formatting, and production build.

**Generated-GIF Reddit comments (v38)** — replaced the separate `SHARE FUNCTION` clipboard action and `EXPORT AS GIF` download with one explicit `COMMENT GIF` action.

- The trusted button tap requests Reddit's run-as-user consent before replay/encoding begins. `devvit.json` now declares `SUBMIT_COMMENT` and media-upload permissions alongside the existing custom-post permission.
- The completed function is replayed at 10 fps and encoded in-browser, but the capture is now exactly 384×204: the top bar and full graph ending immediately above the in-game function panel. The recorded final time stays fixed at the top-right for every frame; the hamburger, hint, CRT `#`, mute, best-time, and star HUD are all omitted.
- The Devvit server validates the GIF89a data URL and run metadata, uploads the animation to Reddit media, and submits a rich-text comment as the player containing the level and `f(x)` used. Generic run shares are replies beneath one app-created stickied anchor per post, following Reddit's score-sharing pattern.
- The v38 Phaser bundle is synced to `src/client/public/content.js`. Phaser verification passes 236 tests; the Devvit wrapper passes type-check, formatting, and production build.

## Devvit wrapper edits since v38 (local — not yet deployed)

These touch only the local Devvit Web wrapper (`src/client/splash.html`), not the Phaser sandbox source, so they carry **no new Phaser version**. `npm run check` passes (type-check + prettier + `vite build`); ship them with `npm run deploy` / `npm run launch`. Verified by rendering the splash in headless Chrome, not yet on a live Reddit post.

**Custom-post splash preview now matches the game's pixel art (2026-07-15).** The authored-level preview on the custom-post splash was rewritten to render like the game's Play-scene graph instead of a flat, straight-on vector sketch.

- Ports the game's `worldToScreen` projection (`PERSP_FAR=0.35`) so the preview uses the same tilted 2.5D grid — wide near the bottom, foreshortened toward a top horizon — over a deep-indigo sky gradient + faint starfield.
- Draws every element as the game does: obstacles as projected polygons with the subtle `obFill`/`obEdge` (circles via the 28-point `obstacleOutline`), floating gold diamond stars with twinkling cores, the shared neon ship glyph (`drawShip`) parked at the start, and the mint planet goal with a pulsing orbit ring.
- Renders into a native **360×176** canvas (the game's `GRAPH` rect) upscaled with `image-rendering: pixelated`, mirroring the game's `scaling: 'pixel'`; square canvas corners. Driven by the existing splash rAF loop, so stars twinkle/bob, the goal pulses and the thruster flickers (static under `prefers-reduced-motion`). The `/api/init` `customLevel.level` data contract is unchanged.

**Splash title switched to the bitmap font (2026-07-15).** The `<author>'s Level` heading above the preview was converted from CSS `<h2>` text to a `.bitmap-text` canvas drawn from `game-font.png` at **variant 2** — the exact glyphs/color the in-game top bar uses for the same heading — and its cyan text-shadow glow was removed. Its width is set to `text.length * 16` (2× the 8px cells) with `max-width: 100%`, so long names scale down proportionally without distortion.

## Key constants (`src/config.ts`)

- Canvas `W=384 H=288` (4:3). World `x∈[-10,10] y∈[-8,8]`.
- `GOAL_TOL=0.4`, `STAR_TOL=0.3`, `SAMPLE_DX=0.02` (collision), `DRAW_DX=0.05` (draw), `UNSTABLE_Y=12` (|y|>12 ⇒ "unstable").
- `TRACE_SPEED=8`, `TRACE_RAMP=0.45`, `COEF_STEP=0.1`, `PERSP_FAR=0.35` (grid tilt).
- `LEADERBOARD_ROW_H=11` (board density).
- Layout rects: `GRAPH={x:12,y:26,w:360,h:176}`, `PANEL={x:0,y:204,w:384,h:84}`, `TOPBAR_H=22`.
- `COL` palette: `accent` `#5cd6ff` (cyan), `accent2` `#a78bff` (violet), `goal` `#6cffb0` (mint), `star` `#ffd86b`, `bad` `#ff6b7a`.

## Conventions & gotchas

- **Parser is sandboxed — never use `eval`.** Allowed: `x`, numbers, `+ - * / ^ ( )`, and `sin cos tan abs sqrt log exp floor min max`. Implicit multiplication works (`3x`, `2sin(x)`).
- **Gameplay math is pure 2D.** The 2.5D tilt is *purely visual* via `worldToScreen`, applied to every rendered element so visuals/collision never desync. If you draw anything on the grid, route it through `worldToScreen`.
- **Every level must stay solvable.** `verify.ts` asserts each level's `knownSolution` reaches the goal + ≥2 stars, and each `hints[0]` reaches the goal. If you touch `levels.ts`, keep `verify` green.
- **Input:** `this.input.bind({...})` → `.pressed/.held/.released`; `this.input.onTap(e=>...)` (e.x/e.y in world coords); `this.input.onText(ch=>...)` for physical-keyboard text; `this.input.pointer` for hover position. Handlers auto-clean on scene transition.
- **Rendering** goes through the handed `r` (`r.drawRect/drawLine/drawCircle/drawPolygon/drawPolyline/text/clipRect/endClip`) — no free-standing canvas calls. `r.text` uses `variant` (color) + `align` (`FONT_ALIGN.*`).
- **`drawShip` is shared** (`scenes/ship.ts`). NOTE: `play.ts` still has its own private copy — if you change the ship look, unify them or update both.
- **Keep `spec/manifest.md` in sync** with mechanic changes — it's the design contract and part of the review surface.

## Open items / suggested next steps

1. **FUNCTION-tab LAUNCH position** was placed on the right (matching Play's LAUNCH). If the intent was the exact bottom-left spot of the TOOLS-tab LAUNCH, the keypad needs reflowing to make room.
2. **Authenticated Reddit playtest:** create, solve, and upload a level, then clear any level and use `COMMENT GIF` in the configured playtest subreddit. Confirm both run-as-user consent flows, the user-owned custom post, the stickied run-share anchor, and the rendered animated reply on a real account.

## Verifying you're set up

`open_project` → `read_files ["engine/raster/index.md"]` → `read_files ["src/scenes/editor.ts"]` → make changes with `write_files` → `verify` (expect `236 passed, 0 failed`) → `preview` → `finish`.
