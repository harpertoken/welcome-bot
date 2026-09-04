<p align="center">
  <img src="https://raw.githubusercontent.com/harpertoken/welcome-bot/main/.github/assets/thumbnail.png" alt="welcome-bot" width="100%">
</p>

# welcome-bot

Bot to greet new helpers in JavaScript. Runs on Cloudflare Workers.

## Scope

- `src/worker.js` - request handler, JSON responses, CORS
- `wrangler.toml` - deploy config
- `package.json` - scripts

## Start

```bash
npm install
npm run dev
```

Runs local on port 8787.

## Deploy

```bash
npm run deploy
```

## Contribute

- Report: open an issue for bugs or requests.
- Change: small pull requests preferred.
