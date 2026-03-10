# Harper Welcome Bot

This service opens a welcome issue when someone submits the website form.

## What you need

- A new repo to receive welcome issues, for example: `harpertoken/welcome-issues`.
- A GitHub token with `repo` scope for that repo.
- A deployed endpoint URL (Cloudflare Workers recommended below).

## Configure

Update these in `wrangler.toml`:

- `WELCOME_OWNER` and `WELCOME_REPO`
- `ALLOWED_ORIGIN` (your website origin)
- `WELCOME_LABELS` (comma-separated labels to apply)
- `WELCOME_ASSIGNEES` (comma-separated GitHub usernames to assign)

Set the GitHub token secret:

```
wrangler secret put GITHUB_TOKEN
```

## Deploy (Cloudflare Workers)

```
npm install
npm run deploy
```

## Website integration

The website form reads the endpoint from `data-endpoint` in `welcome.html`.
Update it to your deployed URL, for example:

```
https://welcome.harpertoken.org/api/welcome
```

## Behavior

The service creates a new issue with:

- Title: `Welcome: <name> (@github)`
- Body: a short intro plus three questions
- Optional labels and assignees (if configured)
- Basic anti-spam honeypot (hidden form field)
