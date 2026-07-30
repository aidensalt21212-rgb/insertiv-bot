const fs = require('fs');
const path = require('path');
const {
  Client,
  GatewayIntentBits,
  EmbedBuilder,
  ActionRowBuilder,
  StringSelectMenuBuilder,
  ChannelType,
  PermissionFlagsBits,
  AttachmentBuilder,
} = require('discord.js');

const HOME_GUILD_ID = '1520396656015835267';
const SETUP_USER_ID = '1481278828696436806';
const STAFF_ROLE_IDS = ['1523883140144304149', '1523906440132165713'];
const TRANSCRIPT_CHANNEL_ID = '1523356462045466775';
const TICKET_CATEGORY_ID = '1523910840796057720';
const TRANSCRIPT_DIRECTORY = path.join(__dirname, 'transcripts');

const CRYPTO_ADDRESSES = {
  '1481278828696436806': {
    btc: 'bc1q7q04zgsxne9frfs6e2jll73cc028eflu58gv8u',
    ltc: 'Lfdb2VaCyvgzMUdMvPqWKM21BqkKkU16gQ',
    eth: '0x24cF460D23e5782b14044F4553EDcBC264b319Bd',
    sol: 'DDbznubPoHAs1JXiaCyLpmAKH1z14R4m2NcxhgqvjFS7',
  },
  '576786582602776587': {
    btc: 'bc1qgk38hee7vv5jxrdvlfxn77vg9wl5p5mwfq227n',
    ltc: 'LYE7SdA5u9NgkgXW2yLm41t5iYRiLgXzJo',
    eth: '0x032E34ed61604d438fe15F07e7618Acd1Eb58f3F',
    sol: 'Baj2VcfZyWWUwHZaR8cTgPBDPW4gCqHGSXnUhvtkBnJB',
  },
};

const TICKET_CHOICES = [
  {
    label: 'Limiteds',
    value: 'Limiteds',
    emoji: { id: '1531490382691434626', name: 'limiteds' },
  },
  {
    label: 'Nitro',
    value: 'Nitro',
    emoji: { id: '1530206308232335491', name: 'Nitro_Badgee' },
  },
  {
    label: 'Boosts',
    value: 'Boosts',
    emoji: { id: '1530206591784325281', name: 'nitro' },
  },
  { label: 'Decors', value: 'Decors', emoji: '🎗️' },
  { label: 'Social Botting', value: 'Social Botting', emoji: '📱' },
  { label: 'Discord OGE', value: 'Discord OGE', emoji: '🔓' },
];

const ticketPanelEmbed = new EmbedBuilder()
  .setTitle('Purchase')
  .setDescription(
    'Click the drop down menu to select the item you would like to order.\n\n**Unsure of what products we offer?**\nOur products are listed at the bottom of the server.'
  )
  .setColor('#5865f2');

const welcomeEmbed = new EmbedBuilder()
  .setTitle('Welcome')
  .setDescription('Support will be with you shortly.\nTo close this ticket, use the `$close` command.')
  .setColor('#57f287');

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMembers,
  ],
});

function getTicketOwnerFromTopic(topic) {
  if (!topic) return null;
  const match = topic.match(/ticketOwner:(\d+)/);
  return match ? match[1] : null;
}

function parseTicketTopic(topic) {
  if (!topic) return {};
  const owner = getTicketOwnerFromTopic(topic);
  const panelMatch = topic.match(/panel:([^;]+)/);
  const optionMatch = topic.match(/option:(.+)/);
  return {
    owner,
    panel: panelMatch ? panelMatch[1] : 'Purchase',
    option: optionMatch ? optionMatch[1] : null,
  };
}

function sanitizeFileName(name) {
  return name.replace(/[^a-zA-Z0-9.-]/g, '-').replace(/-+/g, '-').substring(0, 100);
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function buildTicketSelectMenu() {
  return new ActionRowBuilder().addComponents(
    new StringSelectMenuBuilder()
      .setCustomId('ticket-panel-select')
      .setPlaceholder('Choose an item to order')
      .setMinValues(1)
      .setMaxValues(1)
      .addOptions(...TICKET_CHOICES)
  );
}

function ticketChannelNameFor(option) {
  return option.toLowerCase().replace(/\s+/g, '-');
}

function ensureTranscriptDirectory() {
  if (!fs.existsSync(TRANSCRIPT_DIRECTORY)) {
    fs.mkdirSync(TRANSCRIPT_DIRECTORY, { recursive: true });
  }
}

async function fetchAllMessages(channel) {
  const allMessages = [];
  let lastId;

  while (true) {
    const options = { limit: 100 };
    if (lastId) options.before = lastId;

    const messages = await channel.messages.fetch(options);
    if (!messages.size) break;

    allMessages.push(...messages.values());
    lastId = messages.last().id;
    if (messages.size < 100) break;
  }

  return allMessages.reverse();
}

function buildTranscriptHtml(channel, messages) {
  const title = `Transcript for #${escapeHtml(channel.name)}`;
  const rows = messages
    .map((message) => {
      const author = escapeHtml(message.author.tag);
      const timestamp = escapeHtml(message.createdAt.toISOString());
      const content = escapeHtml(message.content || '');
      const attachments = message.attachments
        .map((attachment) => `<div class="attachment"><a href="${escapeHtml(attachment.url)}">${escapeHtml(attachment.name)}</a></div>`)
        .join('');

      return `
        <div class="message">
          <div class="message-header"><span class="author">${author}</span> <span class="timestamp">${timestamp}</span></div>
          <div class="message-content">${content || '<em>No text content</em>'}</div>
          ${attachments}
        </div>`;
    })
    .join('');

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>${title}</title>
<style>
  body { background: #0b0d12; color: #e3e5e8; font-family: Arial, sans-serif; margin: 0; padding: 24px; }
  h1 { margin-bottom: 8px; }
  .meta { color: #8f959e; margin-bottom: 16px; }
  .message { border-bottom: 1px solid #212529; margin-bottom: 16px; padding-bottom: 12px; }
  .message-header { font-size: 0.95rem; margin-bottom: 6px; color: #adbac7; }
  .author { font-weight: bold; color: #f0f6fc; }
  .timestamp { color: #8f959e; }
  .message-content { white-space: pre-wrap; margin-bottom: 6px; }
  .attachment a { color: #58a6ff; text-decoration: none; }
</style>
</head>
<body>
  <h1>${title}</h1>
  <div class="meta">Channel: #${escapeHtml(channel.name)} | Created at: ${escapeHtml(channel.createdAt.toISOString())}</div>
  ${rows}
</body>
</html>`;
}

async function createTranscriptFile(channel) {
  ensureTranscriptDirectory();
  const messages = await fetchAllMessages(channel);
  const fileName = `transcript-${sanitizeFileName(channel.name)}-${channel.id}.html`;
  const filePath = path.join(TRANSCRIPT_DIRECTORY, fileName);
  const html = buildTranscriptHtml(channel, messages);
  await fs.promises.writeFile(filePath, html, 'utf8');
  return { filePath, fileName };
}

async function sendTranscriptLog(channel) {
  const transcriptChannel = await channel.guild.channels.fetch(TRANSCRIPT_CHANNEL_ID).catch(() => null);
  if (!transcriptChannel || !transcriptChannel.isTextBased()) return null;

  const { filePath, fileName } = await createTranscriptFile(channel);
  const attachment = new AttachmentBuilder(filePath, { name: fileName });
  const topic = parseTicketTopic(channel.topic);

  const logEmbed = new EmbedBuilder()
    .setTitle('Ticket Transcript')
    .setDescription(`A transcript has been created for this ticket.`)
    .setColor('#5865f2')
    .addFields(
      { name: 'Ticket Owner', value: topic.owner ? `<@${topic.owner}>` : 'Unknown', inline: true },
      { name: 'Ticket Name', value: escapeHtml(channel.name), inline: true },
      { name: 'Panel Name', value: escapeHtml(topic.panel || 'Purchase'), inline: true }
    );

  const sent = await transcriptChannel.send({ embeds: [logEmbed], files: [attachment] });
  const url = sent.attachments.first()?.url;
  return url || null;
}

function buildCloseEmbed(transcriptUrl) {
  const embed = new EmbedBuilder()
    .setTitle('Ticket Closed')
    .setDescription('This ticket has been closed. The ticket creator can no longer view this channel.')
    .setColor('#f04747');

  if (transcriptUrl) {
    embed.addFields({ name: 'Transcript', value: `[Open transcript](${transcriptUrl})` });
  }

  return embed;
}

function buildDeletingEmbed(transcriptUrl) {
  const embed = new EmbedBuilder()
    .setTitle('Ticket Deletion')
    .setDescription('This ticket channel will be deleted in 10 seconds.')
    .setColor('#f1c40f');

  if (transcriptUrl) {
    embed.addFields({ name: 'Transcript', value: `[Open transcript](${transcriptUrl})` });
  }

  return embed;
}

function isStaff(member) {
  if (!member) return false;
  return (
    STAFF_ROLE_IDS.some((id) => member.roles.cache.has(id)) ||
    member.permissions.has(PermissionFlagsBits.ManageChannels)
  );
}

client.once('ready', () => {
  console.log(`Logged in as ${client.user.tag}`);
});

client.on('messageCreate', async (message) => {
  if (message.author.bot) return;
  if (!message.guild || message.guild.id !== HOME_GUILD_ID) return;

  const content = message.content.trim().toLowerCase();
  const member = message.member;

  if (content === '$setup') {
    if (message.author.id !== SETUP_USER_ID) return;
    await message.channel.send({ embeds: [ticketPanelEmbed], components: [buildTicketSelectMenu()] });
    return;
  }

  const cryptoSet = CRYPTO_ADDRESSES[message.author.id];
  if (cryptoSet && ['$btc', '$ltc', '$eth', '$sol'].includes(content)) {
    const address = cryptoSet[content.slice(1)];
    if (!address) return;

    const cryptoEmbed = new EmbedBuilder()
      .setTitle(content.slice(1).toUpperCase())
      .setDescription(address)
      .setColor('#5865f2');

    await message.channel.send({ embeds: [cryptoEmbed] });
    return;
  }

  if (content === '$close' || content === '$delete') {
    const ownerId = getTicketOwnerFromTopic(message.channel.topic);
    if (!ownerId) return;

    if (content === '$close') {
      if (message.author.id !== ownerId) {
        await message.channel.send('Only the ticket owner can close this ticket.');
        return;
      }

      const transcriptUrl = await sendTranscriptLog(message.channel).catch(() => null);
      await message.channel.permissionOverwrites.edit(ownerId, {
        ViewChannel: false,
      });
      await message.channel.setName('closed-ticket').catch(() => {});
      await message.channel.send({ embeds: [buildCloseEmbed(transcriptUrl)] });
      return;
    }

    if (content === '$delete') {
      if (message.author.id === ownerId) {
        await message.channel.send('Ticket owners are not allowed to delete the ticket.');
        return;
      }

      if (!isStaff(member)) {
        await message.channel.send('You must be staff to delete a ticket.');
        return;
      }

      const transcriptUrl = await sendTranscriptLog(message.channel).catch(() => null);
      await message.channel.send({ embeds: [buildDeletingEmbed(transcriptUrl)] });
      setTimeout(async () => {
        if (message.channel.deletable) {
          await message.channel.delete().catch(() => {});
        }
      }, 10000);
    }
  }
});

client.on('interactionCreate', async (interaction) => {
  if (!interaction.isStringSelectMenu()) return;
  if (interaction.customId !== 'ticket-panel-select') return;
  if (!interaction.guild || interaction.guild.id !== HOME_GUILD_ID) return;

  const selectedValue = interaction.values[0];
  const ticketName = ticketChannelNameFor(selectedValue);
  const existingChannel = interaction.guild.channels.cache.find(
    (channel) =>
      channel.topic?.startsWith(`ticketOwner:${interaction.user.id};`) &&
      channel.type === ChannelType.GuildText &&
      !channel.name.startsWith('closed-ticket')
  );

  if (existingChannel) {
    await interaction.reply({
      content: `You already have an open ticket: <#${existingChannel.id}>`,
      ephemeral: true,
    });
    return;
  }

  const permissionOverwrites = [
    {
      id: interaction.guild.roles.everyone,
      deny: [PermissionFlagsBits.ViewChannel],
    },
    {
      id: interaction.user.id,
      allow: [
        PermissionFlagsBits.ViewChannel,
        PermissionFlagsBits.SendMessages,
        PermissionFlagsBits.ReadMessageHistory,
      ],
    },
    {
      id: client.user.id,
      allow: [
        PermissionFlagsBits.ViewChannel,
        PermissionFlagsBits.SendMessages,
        PermissionFlagsBits.EmbedLinks,
        PermissionFlagsBits.ReadMessageHistory,
      ],
    },
    ...STAFF_ROLE_IDS.map((roleId) => ({
      id: roleId,
      allow: [
        PermissionFlagsBits.ViewChannel,
        PermissionFlagsBits.SendMessages,
        PermissionFlagsBits.ReadMessageHistory,
      ],
    })),
  ];

  const channel = await interaction.guild.channels.create({
    name: ticketName,
    type: ChannelType.GuildText,
    parent: TICKET_CATEGORY_ID,
    topic: `ticketOwner:${interaction.user.id}; panel:Purchase; option:${selectedValue}`,
    permissionOverwrites,
  });

  await channel.send({
    content: `${interaction.user} ${STAFF_ROLE_IDS.map((roleId) => `<@&${roleId}>`).join(' ')}`,
    embeds: [welcomeEmbed],
  });

  await interaction.reply({
    content: `Your ticket has been created in <#${channel.id}>.`,
    ephemeral: true,
  });
});

let token = process.env.DISCORD_TOKEN;
if (!token) {
  try {
    token = require('./token.js');
  } catch (error) {
    token = null;
  }
}

if (!token) {
  console.error('Missing Discord token. Paste it in token.js or set DISCORD_TOKEN.');
  process.exit(1);
}

client.login(token);


