# Personal Home

A configurable personal homepage built with React and Vite.

## Development

```bash
npm install
PORT=4180 npm run serve
npm run dev
```

`npm run dev` serves the Vite app on `http://127.0.0.1:5173/` and proxies `/api` to the local Node server on port `4180`.

## Production Preview

```bash
npm run build
PORT=4180 npm run serve
```

The Node server serves `dist/` and exposes the QQ Music proxy APIs used by the player.

## Cloudflare Pages

Use these build settings when connecting the repository to Cloudflare Pages:

```text
Framework preset: Vite
Build command: npm run build
Build output directory: dist
Install command: npm ci
```

The project also includes `wrangler.toml` with `pages_build_output_dir = "dist"` for Pages configuration. The QQ Music proxy is implemented again in `functions/api/qq/[endpoint].js`, so `/api/qq/playlist` and `/api/qq/song-url` work on Cloudflare Pages without running `server.mjs`.

For direct upload from this machine, run:

```bash
npm run deploy:pages
```

## Runtime Config

Public, non-sensitive display data lives in:

```text
public/config/site.config.json
```

After `npm run build`, Vite copies it to:

```text
dist/config/site.config.json
```

The browser fetches this JSON at runtime and checks it every few seconds. You can edit `dist/config/site.config.json` after deployment and the opened page will update automatically when the JSON changes.

Do not put API keys, tokens, passwords, or private data in this file. Anything the browser can read is public. Use a small server API and `.env` for sensitive values later, for example weather provider keys.

## QQ Music Player

Set `player.provider` to `qq` and put a QQ Music playlist URL or playlist id in `player.playlistUrl`.

The local Node server reads the public playlist and requests temporary playback URLs from QQ Music Web endpoints. Some songs may not play because of VIP, region, login, copyright, or temporary signature restrictions.
