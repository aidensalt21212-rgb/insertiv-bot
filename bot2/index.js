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

// Configuration for Hood Customs bot
const HOME_GUILD_ID = '1532178493360832682';
const SETUP_USER_ID = '1481278828696436806';
const PANEL_CHANNEL_ID = '1532186617660440586';
const TRANSCRIPT_CHANNEL_ID = '1532188886497886299';
const STAFF_ROLE_IDS = ['1532198278144196850'];

const TICKET_CHOICES = [
  { label: 'Appeal server ban', value: 'Appeal server ban', emoji: { id: '1532195498327408760', name: 'moderation' } },
  { label: 'Report a Staff', value: 'Report a Staff', emoji: '🛡️' },
  { label: 'Report a Member', value: 'Report a Member', emoji: { id: '1532195932630810664', name: 'community' } },
];

const ticketPanelEmbed = new EmbedBuilder()
  .setTitle('Hood Customs Support')
  .setDescription('Open a ticket based on your current scenario to get assistance.\n----------\n**Reload discord if you cannot select an option.**')
  .setColor('#2f3136');

const welcomeEmbed = new EmbedBuilder()
  .setTitle('Welcome')
  .setDescription('Support will be with you shortly.\nTo close this ticket, use the `$close` command.')
  .setColor('#f04747'); // red matching image 2

const closeEmbedBase = new EmbedBuilder()
  .setTitle('Ticket Closed')
  .setDescription('This ticket has been closed. The ticket creator can no longer view this channel.')
  .setColor('#f04747');

const deletingEmbedBase = new EmbedBuilder()
  .setTitle('Ticket Deletion')
  .setDescription('This ticket channel will be deleted in 10 seconds.')
  .setColor('#f04747');

const TRANSCRIPT_DIRECTORY = path.join(__dirname, 'transcripts');

const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent, GatewayIntentBits.GuildMembers],
});

function sanitizeFileName(name) {
  return name.replace(/[^a-zA-Z0-9.-]/g, '-').replace(/-+/g, '-').substring(0, 100);
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/\"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function ensureTranscriptDirectory() {
  if (!fs.existsSync(TRANSCRIPT_DIRECTORY)) fs.mkdirSync(TRANSCRIPT_DIRECTORY, { recursive: true });
}

async function fetchAllMessages(channel) {
  const all = [];
  let lastId;
  while (true) {
    const opts = { limit: 100 };
    if (lastId) opts.before = lastId;
    const messages = await channel.messages.fetch(opts);
    if (!messages.size) break;
    all.push(...messages.values());
    lastId = messages.last().id;
    if (messages.size < 100) break;
  }
  return all.reverse();
}

function buildTranscriptText(channel, messages) {
  // Build a plain-text transcript: one message per line with timestamp, author tag, id, and content.
  const lines = messages.map((m) => {
    const ts = m.createdAt ? m.createdAt.toISOString() : new Date().toISOString();
    const authorTag = m.author?.tag || `${m.author?.username || 'Unknown User'}#0000`;
    const authorId = m.author?.id || 'unknown';
    const content = m.content || m.cleanContent || '';
    const attachments = m.attachments.size
      ? m.attachments.map(a => `\n[Attachment] ${a.name}: ${a.url}`).join('')
      : '';
    // Escape any leading markup to avoid Discord previewing as HTML when possible
    const safeContent = content.replace(/^\s+/, '');
    return `[${ts}] ${authorTag} (${authorId}): ${safeContent}${attachments}`;
  });
  return lines.join('\n');
}

async function createTranscriptFile(channel) {
  ensureTranscriptDirectory();
  const messages = await fetchAllMessages(channel);
  const text = buildTranscriptText(channel, messages);
  const fileName = `transcript-${sanitizeFileName(channel.name)}-${channel.id}.txt`;
  const filePath = path.join(TRANSCRIPT_DIRECTORY, fileName);
  await fs.promises.writeFile(filePath, text, 'utf8');
  return { filePath, fileName };
}

async function sendTranscriptLog(channel) {
  const transcriptChannel = await channel.guild.channels.fetch(TRANSCRIPT_CHANNEL_ID).catch(() => null);
  if (!transcriptChannel || !transcriptChannel.isTextBased()) return null;
  const { filePath, fileName } = await createTranscriptFile(channel);
  const attachment = new AttachmentBuilder(filePath, { name: fileName });
  const topicOwnerMatch = channel.topic ? channel.topic.match(/ticketOwner:(\d+)/) : null;
  const owner = topicOwnerMatch ? topicOwnerMatch[1] : 'Unknown';

  const embed = new EmbedBuilder()
    .setTitle('Ticket Transcript')
    .setDescription('A transcript has been created for this ticket.')
    .setColor('#f04747')
    .addFields(
      { name: 'Ticket Owner', value: owner !== 'Unknown' ? `<@${owner}>` : 'Unknown', inline: true },
      { name: 'Ticket Name', value: `#${escapeHtml(channel.name)}`, inline: true }
    );

  const sent = await transcriptChannel.send({ embeds: [embed], files: [attachment] });
  const url = sent.attachments.first()?.url || null;
  return url;
}

function buildCloseEmbed(transcriptUrl) {
  const embed = new EmbedBuilder()
    .setTitle('Ticket Closed')
    .setDescription('This ticket has been closed. The ticket creator can no longer view this channel.')
    .setColor('#f04747');
  if (transcriptUrl) embed.addFields({ name: 'Transcript', value: `[Open transcript](${transcriptUrl})` });
  return embed;
}

function buildDeletingEmbed(transcriptUrl) {
  const embed = new EmbedBuilder()
    .setTitle('Ticket Deletion')
    .setDescription('This ticket channel will be deleted in 10 seconds.')
    .setColor('#f04747');
  if (transcriptUrl) embed.addFields({ name: 'Transcript', value: `[Open transcript](${transcriptUrl})` });
  return embed;
}

function buildTicketSelectMenu() {
  return new ActionRowBuilder().addComponents(
    new StringSelectMenuBuilder()
      .setCustomId('hood-ticket-select')
      .setPlaceholder('Click me')
      .setMinValues(1)
      .setMaxValues(1)
      .addOptions(...TICKET_CHOICES)
  );
}

function ticketChannelNameFor(option) {
  return option.toLowerCase().replace(/\s+/g, '-');
}

function isStaff(member) {
  if (!member) return false;
  return STAFF_ROLE_IDS.some(id => member.roles.cache.has(id)) || member.permissions.has(PermissionFlagsBits.ManageChannels);
}

client.once('ready', () => {
  console.log(`Logged in as ${client.user.tag}`);
  try {
    client.user.setPresence({ activities: [{ name: 'discord.gg/hoodcustoms' }], status: 'online' });
    console.log('Presence set to discord.gg/hoodcustoms');
  } catch (e) {
    console.warn('Failed to set presence', e);
  }
});

client.on('error', (error) => {
  console.error('Client error:', error);
});

client.on('shardError', (error) => {
  console.error('Shard error:', error);
});

client.on('messageCreate', async (message) => {
  if (message.author.bot) return;
  if (!message.guild || message.guild.id !== HOME_GUILD_ID) return;

  const trimmed = message.content.trim();
  const command = trimmed.split(/\s+/)[0].toLowerCase();
  const args = trimmed.slice(command.length).trim();

  if (command === '$setup') {
    if (message.author.id !== SETUP_USER_ID) return;
    const target = await message.guild.channels.fetch(PANEL_CHANNEL_ID).catch(() => null);
    if (!target) return message.channel.send('Setup target channel not found.');
    await target.send({ embeds: [ticketPanelEmbed], components: [buildTicketSelectMenu()] });
    return;
  }

  if (command === '$add' || command === '$remove' || command === '$close' || command === '$delete') {
    const ownerMatch = message.channel.topic ? message.channel.topic.match(/ticketOwner:(\d+)/) : null;
    if (!ownerMatch) {
      console.warn(`Command used in non-ticket channel: ${message.channel.id}`);
      return message.channel.send('This channel is not a ticket.');
    }
    const ownerId = ownerMatch[1];

    if (command === '$add') {
      if (!isStaff(message.member) && message.author.id !== ownerId) {
        return message.channel.send('Only the ticket owner or staff can add members to this ticket.');
      }

      const targetUserId = message.mentions.users.first()?.id || args.match(/\d{17,20}/)?.[0];
      if (!targetUserId) {
        return message.channel.send('Please mention a user or provide a Discord user ID.');
      }

      // Check bot permissions
      const me = message.guild.members.me;
      if (!me.permissionsIn(message.channel).has(PermissionFlagsBits.ManageChannels)) {
        return message.channel.send('I need the Manage Channels permission to modify ticket members.');
      }

      try {
        // Ensure the user exists in the guild where possible (not required to set overwrite)
        await message.guild.members.fetch(targetUserId).catch(() => null);
        await message.channel.permissionOverwrites.edit(targetUserId, {
          ViewChannel: true,
          SendMessages: true,
          ReadMessageHistory: true,
        });
        return message.channel.send(`Added <@${targetUserId}> to this ticket.`);
      } catch (error) {
        console.error('Failed to add member to ticket:', error);
        return message.channel.send(`I could not add that user to this ticket: ${error.message}`);
      }
    }

    if (command === '$remove') {
      if (!isStaff(message.member) && message.author.id !== ownerId) {
        return message.channel.send('Only the ticket owner or staff can remove members from this ticket.');
      }

      const targetUserId = message.mentions.users.first()?.id || args.match(/\d{17,20}/)?.[0];
      if (!targetUserId) {
        return message.channel.send('Please mention a user or provide a Discord user ID.');
      }

      if (targetUserId === ownerId) {
        return message.channel.send('You cannot remove the ticket owner from this ticket.');
      }

      const me = message.guild.members.me;
      if (!me.permissionsIn(message.channel).has(PermissionFlagsBits.ManageChannels)) {
        return message.channel.send('I need the Manage Channels permission to modify ticket members.');
      }

      try {
        // First attempt to set explicit denies
        await message.channel.permissionOverwrites.edit(targetUserId, {
          ViewChannel: false,
          SendMessages: false,
          ReadMessageHistory: false,
        });
        return message.channel.send(`Removed <@${targetUserId}> from this ticket.`);
      } catch (error) {
        console.error('Failed to remove member from ticket (edit):', error);
        try {
          // Fallback: delete the overwrite entry
          await message.channel.permissionOverwrites.delete(targetUserId);
          return message.channel.send(`Removed <@${targetUserId}> from this ticket.`);
        } catch (err) {
          console.error('Failed to remove member from ticket (delete):', err);
          return message.channel.send(`I could not remove that user from this ticket: ${err.message}`);
        }
      }
    }

    if (command === '$close') {
      const transcriptUrl = await sendTranscriptLog(message.channel).catch(() => null);
      await message.channel.permissionOverwrites.edit(ownerId, { ViewChannel: false }).catch(() => {});
      await message.channel.setName('closed-ticket').catch(() => {});
      await message.channel.send({ embeds: [buildCloseEmbed(transcriptUrl)] });
      return;
    }

    if (command === '$delete') {
      if (message.author.id === ownerId) return message.channel.send('Ticket owners are not allowed to delete the ticket.');
      if (!isStaff(message.member)) return message.channel.send('You must be staff to delete a ticket.');
      const transcriptUrl = await sendTranscriptLog(message.channel).catch(() => null);
      await message.channel.send({ embeds: [buildDeletingEmbed(transcriptUrl)] });
      setTimeout(async () => { if (message.channel.deletable) await message.channel.delete().catch(() => {}); }, 10000);
      return;
    }
  }
});

client.on('interactionCreate', async (interaction) => {
  if (!interaction.isStringSelectMenu()) return;
  if (interaction.customId !== 'hood-ticket-select') return;
  if (!interaction.guild || interaction.guild.id !== HOME_GUILD_ID) return;

  // Check blacklist role before creating a ticket
  const BLACKLIST_ROLE_ID = '1532206109312417852';
  try {
    if (interaction.member && interaction.member.roles && interaction.member.roles.cache.has(BLACKLIST_ROLE_ID)) {
      const blacklistedEmbed = new EmbedBuilder()
        .setTitle('Blacklisted from Tickets')
        .setDescription('You are blacklisted from creating tickets. Please contact Management+ to request an unblacklist.')
        .setColor('#f04747');
      await interaction.reply({ embeds: [blacklistedEmbed], ephemeral: true });
      return;
    }
  } catch (e) {
    // ignore role-check errors and proceed
    console.warn('Error checking blacklist role:', e);
  }

  const selected = interaction.values[0];
  const ticketName = ticketChannelNameFor(selected);
  const existing = interaction.guild.channels.cache.find(ch => ch.topic?.startsWith(`ticketOwner:${interaction.user.id};`) && ch.type === ChannelType.GuildText && !ch.name.startsWith('closed-ticket'));
  if (existing) return interaction.reply({ content: `You already have an open ticket: <#${existing.id}>`, ephemeral: true });

  const permissionOverwrites = [
    { id: interaction.guild.roles.everyone.id, deny: [PermissionFlagsBits.ViewChannel] },
    { id: interaction.user.id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory] },
    { id: client.user.id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.EmbedLinks, PermissionFlagsBits.ReadMessageHistory] },
    ...STAFF_ROLE_IDS.map(roleId => ({ id: roleId, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory] })),
  ];

  // Create the ticket channel in the specified category and apply overwrites
  const channel = await interaction.guild.channels.create({
    name: ticketName,
    type: ChannelType.GuildText,
    topic: `ticketOwner:${interaction.user.id}; panel:Hood Support; option:${selected}`,
    permissionOverwrites,
    parent: '1532210853930205416',
  });

  // Ping the ticket creator and staff roles
  const staffPing = STAFF_ROLE_IDS.map(id => `<@&${id}>`).join(' ');
  await channel.send({ content: `${interaction.user} ${staffPing}`, embeds: [welcomeEmbed] });
  await interaction.reply({ content: `Your ticket has been created in <#${channel.id}>.`, ephemeral: true });
});

function resolveToken() {
  if (process.env.DISCORD_TOKEN2) {
    console.log('Using token source: DISCORD_TOKEN2');
    return process.env.DISCORD_TOKEN2;
  }
  if (process.env.DISCORD_TOKEN) {
    console.log('Using token source: DISCORD_TOKEN');
    return process.env.DISCORD_TOKEN;
  }
  try {
    const localToken = require('./token.js');
    if (localToken) {
      console.log('Using token source: local token.js');
      return localToken;
    }
  } catch (error) {
    console.warn('Unable to load local token.js', error);
  }
  return null;
}

const token = resolveToken();
if (!token) {
  console.error('Missing token. Set DISCORD_TOKEN2 (recommended) or DISCORD_TOKEN in env, or put token in token.js (not recommended).');
  process.exit(1);
}

client.login(token).catch((error) => {
  console.error('Failed to login:', error);
  process.exit(1);
});