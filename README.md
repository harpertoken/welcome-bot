# Harper Welcome Bot

This service opens a welcome issue when someone submits the website form.

## What you need

- A new repo to receive welcome issues, for example: `harpertoken/welcome-issues`.
- A GitHub App installed on the org with permission to create issues in that repo.
- A deployed endpoint URL (Cloudflare Workers recommended below).

## Configure

Update these in `wrangler.toml`:

- `WELCOME_OWNER` and `WELCOME_REPO`
- `ALLOWED_ORIGIN` (your website origin)
- `WELCOME_LABELS` (comma-separated labels to apply)
- `WELCOME_ASSIGNEES` (comma-separated GitHub usernames to assign)
- `GITHUB_APP_ID`
- `GITHUB_APP_INSTALLATION_ID`

Set the GitHub App private key secret:

```
npx wrangler secret put GITHUB_APP_PRIVATE_KEY
```

## GitHub App setup

Create a GitHub App in the org and install it on `harpertoken/welcome-issues`.

Recommended permissions:

- Issues: Read and write
- Metadata: Read-only

Copy the App ID and Installation ID into `wrangler.toml`.
Download the private key and store it as `GITHUB_APP_PRIVATE_KEY`.

## Deploy (Cloudflare Workers)

```
npm install
npm run deploy
```

## Common commands

Check secrets configured for the worker:

```
npx wrangler secret list
```

Add or update the GitHub App private key secret:

```
npx wrangler secret put GITHUB_APP_PRIVATE_KEY
```

Tail live logs (useful for debugging):

```
npx wrangler tail --format=pretty
```

List welcome issues (requires `gh` auth):

```
gh issue list -R harpertoken/welcome-issues
```

## Website integration

The website form reads the endpoint from `data-endpoint` in `welcome.html`.
Update it to your deployed URL, for example:

```
https://harpertoken-welcome-bot.harpertoken-welcome.workers.dev
```

## Behavior

The service creates a new issue with:

- Title: `Welcome: <name> (@github)`
- Body: a short intro plus three questions
- Optional labels and assignees (if configured)
- Basic anti-spam honeypot (hidden form field)
