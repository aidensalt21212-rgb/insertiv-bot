# bot2

This repository contains code for "bot2". This README explains how to provide the bot token securely and how to start the bot.

## Providing the bot token (recommended)

Preferred (production / CI): set the BOT2_TOKEN environment variable before starting the bot. For example (PowerShell):

```powershell
$env:BOT2_TOKEN = "<your-bot-token-here>"
node index.js
```

On Linux/macOS (bash):

```bash
export BOT2_TOKEN="<your-bot-token-here>"
node index.js
```

The code will first look for BOT2_TOKEN (or BOT_TOKEN) and use that value.

## Alternative: local token file (for local development only)

If you prefer a local file, create `token.local.js` next to `token.js` and export your token. Example:

```js
// token.local.js (DO NOT commit this file)
module.exports = 'your-bot-token-here';
// or
module.exports = { token: 'your-bot-token-here' };
```

`token.local.js` is ignored by the included `.gitignore` and is safer than committing tokens into source control.

## token.js

`token.js` tries the following (in order):
1. `process.env.BOT2_TOKEN` or `process.env.BOT_TOKEN`
2. `token.local.js` (if present)

If no token is found it throws an error with instructions. This protects against accidentally running the bot without a token.

## Security notes

- Never commit secrets (tokens, API keys, passwords) to git.
- Use environment variables or a secrets manager for CI and production deployments.
- This repo's `.gitignore` already excludes common secret files and `token.local.js`.

## Starting the bot

How to start depends on the project layout. Typically:

```bash
node index.js
```

If a different start command exists, follow the project's usual startup instructions.

---

If you want this README to be placed in a specific folder or named `README.md` instead of `README-bot2.md`, tell me and it will be adjusted.