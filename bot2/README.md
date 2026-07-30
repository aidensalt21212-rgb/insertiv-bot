# Hood Customs Ticket Bot

A copy of the ticket system customized for Hood Customs.

- Uses `$setup` (by user 1481278828696436806) to post the ticket panel in channel 1532186617660440586 in guild 1532178493360832682.
- Dropdown options: Appeal server ban, Report a Staff, Report a Member.
- Transcript uploads to channel 1532188886497886299.
- Red embeds (#f04747) for close/delete like the provided image.

Setup

1. Install dependencies:

   npm install

2. Set the DISCORD_TOKEN2 environment variable for this service (preferred) or DISCORD_TOKEN, or paste local token into `token.js` (not recommended for production).

3. Start the bot:

   node index.js

Deployment

- Add the repository to Railway, set DISCORD_TOKEN in Railway Variables, and deploy.
