# Gradient Descent

Gradient Descent is a synthwave function-graphing puzzle built as a Devvit Web custom post. Players enter `f(x)`, trace the resulting curve through stars and obstacles, and try to reach the goal.

The browser game in `src/client` is a generated export. Its editable TypeScript source remains in the Phaser Game Agent cloud project documented in `HANDOFF.md`. Do not hand-edit `src/client/public/content.js` or `src/client/public/levels.js`; replace them with a newly verified export instead.

## Requirements

- Node.js 22.2.0 or newer
- A Reddit account connected to Reddit for Developers
- Moderator access to a playtest subreddit, or permission to let Devvit create one

## Development

Register this existing project as a new Devvit app once:

```bash
npx devvit init
```

Complete Reddit's app-creation flow and request `gradient-descent` as the slug if it is available. The CLI will replace the `<% name %>` placeholder in `devvit.json` and synchronize `package.json`; because this directory is already a Devvit project, it will not apply or copy another template. Do not use `--force`.

Then start development:

```bash
npm install
npm run login
npm run check
npm run dev
```

`npm run dev` starts a Devvit playtest, builds on changes, installs the current app version, and streams server logs. The moderator menu action **Create Gradient Descent post** creates another playable post when needed.

## Export layout

```text
src/client/index.html                 HTML entrypoint processed by Vite
src/client/public/content.js          generated game bundle copied unchanged
src/client/public/levels.js           preserved generated level export
src/client/public/assets/             images and music copied unchanged
src/server/index.ts                   Devvit server and post-creation action
```

When replacing the generated game export:

1. Verify and publish the editable Phaser cloud project.
2. Merge any export wrapper changes into `src/client/index.html` and replace `src/client/public/content.js` with the new game bundle. Keep the Vite-ignored `/content.js` import in `index.html`.
3. Replace `src/client/public/levels.js` and `src/client/public/assets` if they changed.
4. Run `npm run check` and confirm that all referenced `/assets/...` files exist in `dist/client/assets`.

## Deployment

Upload a private installable build:

```bash
npm run deploy
```

Submit the uploaded build for Reddit review:

```bash
npm run launch
```

The preferred Devvit app slug is `gradient-descent`. Before initialization, `devvit.json` intentionally contains the official `<% name %>` placeholder. `npx devvit init` replaces it with the slug registered by Reddit and updates `package.json` to match.
