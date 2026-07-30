# Discord Ticket Bot

A Discord ticket system bot built with discord.js.

## Features

- ` $setup` command from a single authorized user to send a ticket panel.
- Dropdown ticket creation with options: Limiteds, Nitro, Boosts, Decors, Social Botting, Discord OGE.
- Private ticket channel creation for the requesting user and staff roles.
- `$close` command for ticket owners to close their ticket.
- `$delete` command for staff to delete a ticket after a 10-second delay.
- Owner-only crypto address commands for two specific users.

## Setup

1. Install dependencies:

   ```powershell
   npm install
   ```

2. Create a Discord application and bot, then enable the following gateway intents:
   - `Guilds`
   - `GuildMessages`
   - `Message Content`
   - `Guild Members`

3. Add the bot to your server.

4. Paste your bot token into `token.js`, or export `DISCORD_TOKEN` in your environment.

5. Start the bot:

   ```powershell
   .\run.bat
   ```

   or

   ```powershell
   .\run.ps1
   ```

## Configuration

- The bot is configured to work in guild `1520396656015835267`.
- Only user `1481278828696436806` can use `$setup` and the first crypto command set.
- Only user `576786582602776587` can use the second crypto command set.
- Staff roles `1523883140144304149` and `1523906440132165713` are automatically pinged when a ticket is created.
- Ticket channels are created in category `1523910840796057720`.
- Ticket close and delete actions generate transcript HTML files and upload them to the transcript log channel `1523356462045466775`.

Hosting on Railway (step-by-step)

1) Prepare the repo locally

   - Remove any live tokens: ensure `token.js` is empty (the project already contains a placeholder). Do NOT commit any token.
   - Initialize a git repo, commit the project, and push to GitHub.

   Example commands (run from `C:\Users\mits2\inertiv`):

   ```cmd
   cd C:\Users\mits2\inertiv
   git init
   git add .
   git commit -m "Initial commit - Discord ticket bot" --author="Copilot <223556219+Copilot@users.noreply.github.com>"
   rem Create a GitHub repo manually and then add the remote, e.g.:
   git remote add origin https://github.com/yourusername/discord-ticket-bot.git
   git branch -M main
   git push -u origin main
   ```

   Note: create the GitHub repository through github.com first, then use the URL above.

2) Set the start command

   - package.json already has `"start": "node index.js"`, Railway will use that by default.

3) Create a Railway project and connect your GitHub repo

   - Go to https://railway.app and sign in (GitHub recommended).
   - Click "New Project" → "Deploy from GitHub repo" and choose your repository.
   - Select the `main` branch and create the project.

4) Set environment variables on Railway

   - In your Railway project, open "Settings" → "Variables".
   - Add a variable:
     - Key: DISCORD_TOKEN
     - Value: (your Discord bot token)
   - Save the variable.

5) Deploy

   - Trigger a deployment (Railway will build and run using `npm install` and `npm start`).
   - Check the logs on Railway to confirm the bot starts and logs `Logged in as <botname>`.

6) (Optional) Activate persistent storage for transcripts

   - The bot saves transcript HTML to `./transcripts` in the container. Railway instances are ephemeral — to keep transcripts long-term, either:
     - Upload transcripts to an external storage (S3, Google Cloud Storage) — modify `sendTranscriptLog` to upload instead of relying on attachment URLs, or
     - Push transcripts into a separate permanent channel (the bot already uploads the file to the transcript channel as an attachment). Attachments uploaded to Discord are persisted by Discord.

7) Troubleshooting

   - If the bot does not start, check Railway build logs for errors.
   - Ensure the `DISCORD_TOKEN` env var is set and valid, and the bot has the required intents and permissions in the Discord Developer Portal.

Security notes

- Never put your bot token in source code or public repos. Use Railway environment variables.
- `token.js` is included in `.gitignore` to avoid accidental commits.

If you'd like, I can:
- Create the local git commits here (I can run git commands in this environment and push if you give the remote URL), or
- Generate a ready-to-push GitHub repo archive and give you instructions to upload, or
- Modify the bot to upload transcripts to S3 (requires AWS credentials) for durable storage.

## Notes

- The bot uses message-based commands rather than slash commands.
- If a ticket owner tries to use `$delete`, the bot rejects the request.
- If a staff member uses `$delete`, the channel is deleted after a 10-second countdown.
