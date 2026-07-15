import { devvit } from '@devvit/start/vite';
import { defineConfig, type Plugin } from 'vite';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

// The generated Phaser bundle (src/client/public/content.js) loads its title
// logo and music from absolute CDN URLs (cdn.gorf.io / digitaloceanspaces.com).
// Those load fine on phaser.io but are blocked by Reddit's Devvit webview CSP,
// so the title card is missing in-game on Reddit. The same assets are shipped
// same-origin under public/assets, so rewrite those hosts to `/assets/` in the
// built output. This only touches the build artifact — content.js is generated
// and must not be hand-edited — so it survives future sandbox re-syncs.
function localizeGameAssets(): Plugin {
  const HOSTS = [
    'https://cdn.gorf.io/',
    'https://gameblocks.nyc3.digitaloceanspaces.com/',
  ];
  return {
    name: 'localize-game-assets',
    apply: 'build',
    closeBundle() {
      const file = resolve('dist/client/content.js');
      if (!existsSync(file)) return;
      let src = readFileSync(file, 'utf8');
      let count = 0;
      for (const host of HOSTS) {
        const parts = src.split(host);
        count += parts.length - 1;
        src = parts.join('/assets/');
      }
      if (count > 0) {
        writeFileSync(file, src);
        this.warn(
          `localize-game-assets: rewrote ${count} external asset URL(s) in content.js to /assets/`,
        );
      }
    },
  };
}

export default defineConfig({
  plugins: [
    localizeGameAssets(),
    devvit({
      client: {
        build: {
          chunkSizeWarningLimit: 2000,
        },
      },
    }),
  ],
});
