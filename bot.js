const { Telegraf } = require('telegraf');

const axios = require('axios');

const BOT_TOKEN = '8030113226:AAEkq5SOpY57jGm2m3tsSyhYr30cwcICRcI';

const ADMINS = ['7469801870', '6619154186']; // Both admin IDs

const bot = new Telegraf(BOT_TOKEN);

// Bot modes and user tracking

let paidMode = false;

const userLastRequest = new Map();

// Check if user is admin

function isAdmin(userId) {

  return ADMINS.includes(userId.toString());

}

// Admin commands

bot.command('paid', (ctx) => {

  if (isAdmin(ctx.from.id)) {

    paidMode = true;

    ctx.reply('💰 Paid mode activated. Only admins can use the bot now.');

  }

});

bot.command('free', (ctx) => {

  if (isAdmin(ctx.from.id)) {

    paidMode = false;

    ctx.reply('🆓 Free mode activated. All users can access the bot.');

  }

});

// Start command with mode info

bot.start((ctx) => {

  const modeStatus = paidMode ? '💰 (Currently in PAID mode)' : '🆓 (Currently in FREE mode)';

  const adminNotice = isAdmin(ctx.from.id) ? '\n\nYou are an admin. Use /paid or /free to change mode.' : '';

  ctx.reply(`🌐 Website & Bot Code Fetcher ${modeStatus}${adminNotice}\n\nSend me:\n• A website URL to get its code\n• A bot username (@examplebot) to get its source code`);

});

// Handle all messages

bot.on('text', async (ctx) => {

  try {

    // Skip if message is a command

    if (ctx.message.text.startsWith('/')) return;

    // Check if in paid mode and user is not admin

    if (paidMode && !isAdmin(ctx.from.id)) {

      return ctx.reply('❌ This bot is currently in paid mode. Only admins can use it.');

    }

    const userId = ctx.from.id;

    const now = Date.now();

    

    // Rate limiting

    if (userLastRequest.has(userId)) {

      const lastRequestTime = userLastRequest.get(userId);

      if (now - lastRequestTime < 10000) {

        return ctx.reply('⏳ Please wait 10 seconds between requests.');

      }

    }

    userLastRequest.set(userId, now);

    

    const input = ctx.message.text.trim();

    

    // Handle Telegram bot username requests

    if (input.startsWith('@')) {

      const botUsername = input.replace('@', '');

      await handleBotCodeRequest(ctx, botUsername);

      return;

    }

    

    // Handle regular website URLs

    let url;

    try {

      url = new URL(input.includes('://') ? input : `https://${input}`);

      await handleWebsiteRequest(ctx, url);

    } catch (e) {

      ctx.reply('❌ Invalid input. Please provide:\n• A valid website URL (https://example.com)\n• Or a bot username (@examplebot)');

    }

  } catch (error) {

    console.error('Bot error:', error);

    ctx.reply('⚠️ An unexpected error occurred. Please try again later.');

  }

});

async function handleBotCodeRequest(ctx, botUsername) {

  const processingMsg = await ctx.reply(`🔄 Searching for @${botUsername} source code...`);

  

  try {

    // Try to find bot code on popular repositories

    const searchUrls = [

      `https://github.com/search?q=${botUsername}+telegram+bot`,

      `https://gitlab.com/search?search=${botUsername}`,

      `https://bitbucket.org/repo/all?name=${botUsername}`

    ];

    

    let foundCode = false;

    

    // Check each repository (simplified example)

    for (const searchUrl of searchUrls) {

      try {

        const response = await axios.get(searchUrl, {

          headers: { 'User-Agent': 'Mozilla/5.0' },

          timeout: 10000

        });

        

        if (response.data.includes(botUsername)) {

          foundCode = true;

          const filename = `bot-code-${botUsername}.txt`;

          const caption = `🔍 Found potential source code for @${botUsername}\n\n🔗 ${searchUrl}\n\nNote: This is a search result link. Please check the repository for actual code.`;

          

          await ctx.telegram.sendDocument(

            ctx.chat.id,

            { source: Buffer.from(`Source code links for @${botUsername}:\n\nGitHub: ${searchUrls[0]}\nGitLab: ${searchUrls[1]}\nBitbucket: ${searchUrls[2]}`), filename },

            { caption }

          );

          break;

        }

      } catch (e) {

        continue;

      }

    }

    

    if (!foundCode) {

      await ctx.telegram.editMessageText(

        processingMsg.chat.id,

        processingMsg.message_id,

        null,

        `❌ Could not find source code for @${botUsername}\n\nTry searching manually on:\n• GitHub: https://github.com/search?q=${botUsername}\n• GitLab: https://gitlab.com/search?search=${botUsername}`,

        { parse_mode: 'HTML' }

      );

    } else {

      await ctx.telegram.deleteMessage(processingMsg.chat.id, processingMsg.message_id);

    }

    

  } catch (error) {

    console.error('Bot code search error:', error);

    await ctx.telegram.editMessageText(

      processingMsg.chat.id,

      processingMsg.message_id,

      null,

      `❌ Error searching for bot code\n\n${error.message}`,

      { parse_mode: 'HTML' }

    );

  }

}

async function handleWebsiteRequest(ctx, url) {

  const processingMsg = await ctx.reply(`🔄 Fetching ${url.hostname}...`);

  

  try {

    const response = await axios.get(url.href, {

      headers: {

        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'

      },

      timeout: 15000

    });

    

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');

    const filename = `website-code-${url.hostname}-${timestamp}.html`;

    const fileCaption = `🌐 ${url.href}\n📁 ${filename}\n📅 ${new Date().toLocaleString()}`;

    

    await ctx.telegram.sendDocument(

      ctx.chat.id,

      { source: Buffer.from(response.data), filename },

      { caption: fileCaption }

    );

    

    await ctx.telegram.deleteMessage(processingMsg.chat.id, processingMsg.message_id);

    

  } catch (error) {

    console.error('Fetch error:', error);

    await ctx.telegram.editMessageText(

      processingMsg.chat.id,

      processingMsg.message_id,

      null,

      `❌ Failed to fetch website\n\nError: ${error.message}`,

      { parse_mode: 'HTML' }

    );

  }

}

bot.launch().then(() => console.log('Bot running with 2-admin support'));

process.once('SIGINT', () => bot.stop('SIGINT'));

process.once('SIGTERM', () => bot.stop('SIGTERM'));
