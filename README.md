# Gradient Descent

**Plot the function. Pilot the ship. Reach the goal.**

Gradient Descent is a retro-themed function-graphing puzzle built as a Reddit custom post using Devvit Web and Phaser.

Instead of controlling a ship with directional buttons, players control its path by creating a mathematical function. The ship traces the resulting curve across a Cartesian grid, where players must collect stars, avoid obstacles, and reach the goal.

Built for Reddit’s **Games with a Hook Hackathon**.

---

## Gameplay

Each level contains:

* A starting point
* A target destination
* Collectible stars
* Obstacles that the path must avoid

Players construct or type a function in the form:

```text
f(x) = ...
```

Pressing **Launch** sends the ship along the plotted curve. A successful function must guide the ship through the level without colliding with an obstacle.

Players can experiment, adjust their equation, and relaunch until they find a valid path.

---

## Features

### Function-Based Movement

The player’s equation is the controller. The game transforms the submitted function so the plotted path begins at the level’s starting position.

Functions are processed through a restricted mathematical parser rather than JavaScript `eval`.

### 30-Level Campaign

The campaign contains 30 progressively designed levels that introduce new layouts, obstacles, and function-building challenges.

### Two Input Modes

Players can build functions using accessible on-screen blocks or type equations directly in the advanced input mode.

### Daily Challenge

A deterministic daily puzzle is generated from the current calendar date.

Daily levels:

* Change each day
* Preserve the same layout for the same date
* Use the normal scoring and leaderboard systems
* Track consecutive-day participation for signed-in Reddit users
* Do not overwrite campaign progress

The Devvit scheduler also publishes and pins a daily challenge post at `00:00 UTC`.

### Reddit Leaderboards

Campaign, daily, and community-created levels have Reddit-account-based leaderboards backed by Redis.

Runs are ranked by:

1. Stars collected
2. Completion time

Only a player’s first successful submission is recorded for each level, preventing retries from replacing the original result.

The leaderboard returns the top 100 players and the current player’s true rank.

### Level Editor

Players can create their own challenges by placing:

* A starting point
* A goal
* Stars
* Obstacles

Creators can test-fly their level using the same path and collision system as the main game.

Publishing remains locked until the creator reaches the goal and collects every star, ensuring that uploaded levels have a verified solution.

After authorization, the level is published from the creator’s Reddit account as its own playable custom post.

### Animated Run Sharing

After completing a level, players can replay their successful path and encode it as an animated GIF.

The GIF displays:

* The level
* The submitted function
* The ship’s path
* Collected stars
* Obstacles
* The final completion time

With Reddit permission, the GIF is uploaded and posted as a rich-text comment beneath the game post.

### Persistent Retro Presentation

The game uses pixel-art visuals, a tilted Cartesian grid, animated backgrounds, a neon spaceship, and a soundtrack that continues between game scenes.

---

## Technology

| Layer              | Technology            |
| ------------------ | --------------------- |
| Game engine        | Phaser                |
| Reddit integration | Devvit Web            |
| Language           | TypeScript            |
| Server framework   | Hono                  |
| Persistence        | Devvit Redis          |
| Build system       | Vite                  |
| Formatting         | Prettier              |
| Runtime            | Node.js 22.2 or newer |

---

## Project Architecture

```text
src/
├── client/
│   ├── index.html            # Main game entrypoint
│   ├── splash.html           # Reddit custom-post splash screen
│   ├── leaderboard.ts        # Client leaderboard bridge
│   ├── daily-streak.ts       # Client daily-streak bridge
│   ├── custom-levels.ts      # Custom-level publishing bridge
│   ├── share-run.ts          # GIF comment authorization and upload bridge
│   └── public/
│       ├── content.js        # Generated Phaser game bundle
│       ├── levels.js         # Generated level data
│       └── assets/           # Images, interface assets, and music
│
└── server/
    ├── index.ts              # Devvit API routes and menu endpoints
    ├── leaderboard.ts        # Redis-backed leaderboard storage
    ├── daily-post.ts         # Scheduled UTC daily-post publishing
    ├── daily-streak.ts       # Consecutive-day tracking
    ├── custom-levels.ts      # Level validation and post creation
    └── share-run.ts          # GIF validation, media upload, and comments
```

---

## Important Development Note

This repository contains the Devvit Web wrapper and a generated Phaser build.

The following files are generated artifacts:

```text
src/client/public/content.js
src/client/public/levels.js
```

Do not make gameplay changes directly inside these files. Replace them with a newly built and verified Phaser export instead.

The Devvit configuration, server code, client integration bridges, splash screen, and build configuration can be edited normally in this repository.

---

## Requirements

Before running the project, install or configure:

* Node.js `22.2.0` or newer
* npm
* A Reddit account
* Access to Reddit for Developers
* Moderator access to a development subreddit

---

## Installation

Install the project dependencies:

```bash
npm install
```

Log in to Reddit through the Devvit CLI:

```bash
npm run login
```

When registering a separate copy as a new Devvit application, initialize it through the Devvit CLI:

```bash
npx devvit init
```

Follow the application-creation prompts. Do not use the `--force` option on this existing project structure.

---

## Scoring and Competition

Leaderboards prioritize level completion quality over speed.

A run with more stars always ranks above a run with fewer stars. When two players collect the same number of stars, the faster completion ranks higher.

Campaign, daily, and community-level leaderboards use separate Redis namespaces so results from different levels cannot mix.

---

## Security and Validation

Server-side validation is applied to all player-submitted data, including:

* Custom-level coordinates
* Obstacles and stars
* Function length and allowed characters
* Leaderboard level identifiers
* Completion times
* Star counts
* GIF format and file size
* Reddit post metadata

Reddit usernames and user IDs are resolved from the authenticated Devvit context rather than accepted from client requests.
