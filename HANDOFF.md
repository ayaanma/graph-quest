# GraphQuest — Agent Handoff

_Last updated: 2026-07-14 · Published version: **15** · Phaser project id: `RjzqGQux4x1`_

## TL;DR — read this first

**This local folder (`/Users/mattma/Projects/graph-quest`) is a BUILT EXPORT, not the source of truth.**
`content.js` is a minified esbuild bundle and `levels.js` is generated data. **Do not edit them** — changes here do nothing to the real game.

The **real, editable TypeScript source lives in the Phaser Game Agent cloud sandbox**, project `RjzqGQux4x1`, owned by the user's Phaser account (user `maatm`). You reach it through the **`phaser-game-agent` MCP tools**, never through the local filesystem.

GraphQuest is a synthwave function-graphing puzzle: the player writes `f(x)`, and a ship traces the curve `g(x) = f(x) - f(x_start) + y_start` across a tilted 2.5D Cartesian grid, dodging rectangular obstacles, threading stars, and reaching a goal.

## How to work on it (the MCP workflow)

All tools are prefixed `mcp__phaser-game-agent__phaser_game_agent_*` (some are deferred — load schemas with ToolSearch `select:<name>` first).

1. **`open_project`** with `projectId: "RjzqGQux4x1"` — always first (resumes the paused sandbox).
2. **`snapshot`** with a label before any big/risky change (keeps newest 5; restore with `restore`).
3. **`read_files`** / **`grep`** / **`ls`** to explore. ⚠️ `read_files` fails if the batch is too large — read big files (e.g. `play.ts` ~34KB) one at a time.
4. **`write_files`** to author. ⚠️ **This overwrites the ENTIRE file** — there is no partial-edit tool for the sandbox. You must supply full file contents. Read the file first, modify, write it whole.
5. **`verify`** — runs `tsc` (type-check) + `src/verify.ts` acceptance tests. Must be `ok: true` before publishing. Currently **194 tests pass, 0 fail**.
6. **`preview`** with a `changes:` note — builds + publishes a new version to the user's Phaser account, returns the play URL.
7. **`finish`** — pauses the sandbox to stop billing (auto-resumes on next call). Call it when done each session.

**Play URL:** https://phaser.io/agent/local/RjzqGQux4x1
**Credits:** ~1363 remaining (each session bills a little; `finish` stops idle billing).

Engine docs live in the sandbox at `engine/raster/*.md` + `*.d.ts` — **reference only, never edit** `engine/`. Start with `engine/raster/index.md`, then per-topic docs (`input.md`, `particles.md`, etc.).

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

## What was built recently (versions 12–15)

Earlier (v12): ported three feature commits from the local build into the TS source — a moving spaceship trace head, the 30-level campaign, and physical-keyboard input in Advanced mode.

**The Level Editor (v13–v15)** — a `create-your-own-level` scene reached from the title screen. Current behavior:

- **Scene:** `src/scenes/editor.ts`, registered as role `editor` in `game.ts`; reached via `this.game.goto('editor')` from the Title `LEVEL EDITOR` button.
- **Two-tab panel:** `TOOLS` (placement) and `FUNCTION` (type `f(x)`), mirroring Play's BLOCKS/TYPE tabs.
- **Tools:** `START` / `GOAL` (one tap moves), `WALL` (tap two corners → rectangle, live rubber-band preview), `STAR` (one tap), `ERASE` (tap a wall/star to delete).
- **Coordinate mapping:** taps → world via `screenToWorld` (exact inverse of `worldToScreen`; round-trip asserted in `verify.ts`). **Every placed coordinate snaps to 3 decimals** (`Number(v.toFixed(3))`), matching the campaign data format.
- **Wall guard:** a wall may not cover the start pad, goal, or any star (checked against each anchor's tolerance radius — `GOAL_TOL` 0.4 / `STAR_TOL` 0.3). Blocked drops turn the preview red and are refused with an error buzz.
- **LAUNCH (test-fly):** builds a transient `Level` from the current placement and runs the real `computeTrace`, animating the shared ship, popping stars, reporting goal/fail via a toast. Present in **both** tabs — small button bottom-left in TOOLS, tall button on the right in FUNCTION (matching Play's LAUNCH position).
- **UPLOAD (placeholder, no backend):** stays dim/locked until a LAUNCH fly reaches the goal collecting **all** stars (`completed` flag). On a full-star clear it lights up (cyan glow + pulse). **Any edit re-locks it** (`completed = false` on every mutation). Tapping while locked prompts the requirement. There is intentionally **no upload backend yet**.
- **Cursor coordinate readout** centered at the top of the screen while hovering the grid.

## Key constants (`src/config.ts`)

- Canvas `W=384 H=288` (4:3). World `x∈[-10,10] y∈[-8,8]`.
- `GOAL_TOL=0.4`, `STAR_TOL=0.3`, `SAMPLE_DX=0.02` (collision), `DRAW_DX=0.05` (draw), `UNSTABLE_Y=12` (|y|>12 ⇒ "unstable").
- `TRACE_SPEED=8`, `TRACE_RAMP=0.45`, `COEF_STEP=0.1`, `PERSP_FAR=0.35` (grid tilt).
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

1. **UPLOAD has no backend.** Wire it to actually persist/publish a custom level (define a serialization format for `{start, goal, obstacles, stars, adv}`; the editor already snaps everything to 3dp). Consider where custom levels get stored and how they're played.
2. **Starless-level edge case:** a level with **zero stars** currently counts as "all stars collected" the instant the ship reaches the goal, so UPLOAD unlocks on goal alone. Decide whether to require ≥1 star.
3. **FUNCTION-tab LAUNCH position** was placed on the right (matching Play's LAUNCH). If the intent was the exact bottom-left spot of the TOOLS-tab LAUNCH, the keypad needs reflowing to make room.
4. **Playtest the editor visually** — the sandbox can screenshot; verify covers logic/type-safety but not layout. Watch panel text overflow at 384px width.
5. **Older divergence not ported:** the local build carries an older `v4` GIF-export / reworked complete-screen feature that was intentionally NOT ported (it wasn't part of the requested work). Port only if asked.

## Verifying you're set up

`open_project` → `read_files ["engine/raster/index.md"]` → `read_files ["src/scenes/editor.ts"]` → make changes with `write_files` → `verify` (expect `194 passed, 0 failed`) → `preview` → `finish`.
