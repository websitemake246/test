const { Telegraf, Markup } = require("telegraf");
const express = require("express");
require("dotenv").config();

const BOT_TOKEN = process.env.BOT_TOKEN;
const bot = new Telegraf(BOT_TOKEN);
const app = express();
const PORT = process.env.PORT || 3000;

app.get("/", (req, res) => {
    res.send("Telegram bot is running...");
});

// Middleware to check if user is an admin
async function isAdmin(ctx, userId) {
    try {
        const chatMember = await ctx.telegram.getChatMember(ctx.chat.id, userId);
        return chatMember.status === "administrator" || chatMember.status === "creator";
    } catch (error) {
        console.error("Error checking admin status:", error);
        return false;
    }
}

// /menu Command - Show all commands
bot.command("menu", (ctx) => {
    const menuText = `👑 *Welcome to King Khalid TG Bot* 👑\n\nHere are the available commands:\n
/menu - display the bot menu
/tictactoe @username - Start a Tic-Tac-Toe game
/kick - Kick a user from the group
/promote - Make a user an admin
/calculate - e.g /calculate 576+767
/welcome on - enable welcome message
/welcome off - disable welcome message
/goodbye on - enable goodbye message
/goodbye off -disable goodbye message
/demote - Remove a user's admin rights`;

    ctx.replyWithPhoto("https://i.postimg.cc/4dwH0fWd/FB-IMG-17346222734789159.jpg", {
        caption: menuText,
        parse_mode: "Markdown",
    });
});

// Tic-Tac-Toe Game
const games = new Map();

bot.command("tictactoe", async (ctx) => {
    if (!ctx.chat || ctx.chat.type === "private") {
        return ctx.reply("This command only works in groups.");
    }

    const mentionedUser = ctx.message.entities?.find((e) => e.type === "mention");
    if (!mentionedUser) {
        return ctx.reply("Please mention a user to play against. Example: /tictactoe @username");
    }

    const challenger = ctx.from.id;
    const opponentUsername = ctx.message.text.split(" ")[1];

    games.set(opponentUsername, { challenger, chatId: ctx.chat.id });

    ctx.reply(`${opponentUsername}, you have been challenged to a Tic-Tac-Toe game! Type /accept within 40 seconds to play.`);

    setTimeout(() => {
        if (games.has(opponentUsername)) {
            games.delete(opponentUsername);
            ctx.reply("Game request timed out. Challenge canceled.");
        }
    }, 40000);
});

const users = new Map(); // Store user balances and last daily claim time

// Function to get user data
function getUser(userId) {
    if (!users.has(userId)) {
        users.set(userId, { balance: 0, lastDaily: 0 });
    }
    return users.get(userId);
}

// /daily - Claim 50 coins once per day
bot.command("daily", (ctx) => {
    const userId = ctx.from.id;
    const user = getUser(userId);
    const now = Date.now();

    if (now - user.lastDaily < 24 * 60 * 60 * 1000) {
        return ctx.reply("❌ You have already claimed your daily reward. Come back tomorrow!");
    }

    user.balance += 50;
    user.lastDaily = now;
    ctx.reply("✅ You have claimed 50 coins! Come back tomorrow for more.");
});

// /wallet - Show balance
bot.command("wallet", (ctx) => {
    const userId = ctx.from.id;
    const user = getUser(userId);
    ctx.reply(`👛 **Wallet**\n👤 Username: @${ctx.from.username || ctx.from.first_name}\n💰 Balance: ${user.balance} coins`);
});

// /slot - Slot machine game
bot.command("slot", (ctx) => {
    const userId = ctx.from.id;
    const user = getUser(userId);

    if (user.balance < 10) {
        return ctx.reply("❌ You need at least 10 coins to play!");
    }

    const symbols = ["🍒", "🍋", "🍊", "🍉", "🍇"];
    const slot1 = symbols[Math.floor(Math.random() * symbols.length)];
    const slot2 = symbols[Math.floor(Math.random() * symbols.length)];
    const slot3 = symbols[Math.floor(Math.random() * symbols.length)];

    if (slot1 === slot2 && slot2 === slot3) {
        user.balance += 50;
        ctx.reply(`🎰 ${slot1} | ${slot2} | ${slot3}\n🎉 You won 50 coins!`);
    } else {
        user.balance -= 10;
        ctx.reply(`🎰 ${slot1} | ${slot2} | ${slot3}\n❌ You lost 10 coins! Try again.`);
    }
});

// /rob @username - Steal 10 coins (with a chance of failure)
bot.command("rob", (ctx) => {
    if (!ctx.message.reply_to_message) {
        return ctx.reply("❌ You must reply to a user's message to rob them.");
    }

    const thiefId = ctx.from.id;
    const victimId = ctx.message.reply_to_message.from.id;
    const victimUsername = ctx.message.reply_to_message.from.username || ctx.message.reply_to_message.from.first_name;

    if (thiefId === victimId) {
        return ctx.reply("❌ You can't rob yourself!");
    }

    const thief = getUser(thiefId);
    const victim = getUser(victimId);

    if (victim.balance < 10) {
        return ctx.reply(`❌ Sorry, @${victimUsername} has no cash in their wallet.`);
    }

    const caught = Math.random() < 0.5; // 50% chance of getting caught

    if (caught) {
        thief.balance -= 10;
        ctx.reply(`🚔 You got caught while robbing @${victimUsername}! You lost 10 coins.`);
    } else {
        thief.balance += 10;
        victim.balance -= 10;
        ctx.reply(`💰 You successfully robbed 10 coins from @${victimUsername}!`);
    }
});

const groupSettings = new Map(); // Store settings per group

// Function to check if user is an admin
async function isAdmin(ctx, userId) {
    try {
        const chatMember = await ctx.telegram.getChatMember(ctx.chat.id, userId);
        return chatMember.status === "administrator" || chatMember.status === "creator";
    } catch (error) {
        console.error("Error checking admin status:", error);
        return false;
    }
}

// Command to toggle welcome messages (Admins Only)
bot.command("welcome", async (ctx) => {
    if (ctx.chat.type === "private") return ctx.reply("This command only works in groups.");
    if (!(await isAdmin(ctx, ctx.from.id))) return ctx.reply("❌ Only admins can use this command.");

    const chatId = ctx.chat.id;
    const command = ctx.message.text.split(" ")[1];

    if (command === "on") {
        groupSettings.set(chatId, { ...groupSettings.get(chatId), welcome: true });
        ctx.reply("✅ Welcome messages enabled!");
    } else if (command === "off") {
        groupSettings.set(chatId, { ...groupSettings.get(chatId), welcome: false });
        ctx.reply("❌ Welcome messages disabled!");
    } else {
        ctx.reply("Use /welcome on or /welcome off.");
    }
});

// Command to toggle goodbye messages (Admins Only)
bot.command("goodbye", async (ctx) => {
    if (ctx.chat.type === "private") return ctx.reply("This command only works in groups.");
    if (!(await isAdmin(ctx, ctx.from.id))) return ctx.reply("❌ Only admins can use this command.");

    const chatId = ctx.chat.id;
    const command = ctx.message.text.split(" ")[1];

    if (command === "on") {
        groupSettings.set(chatId, { ...groupSettings.get(chatId), goodbye: true });
        ctx.reply("✅ Goodbye messages enabled!");
    } else if (command === "off") {
        groupSettings.set(chatId, { ...groupSettings.get(chatId), goodbye: false });
        ctx.reply("❌ Goodbye messages disabled!");
    } else {
        ctx.reply("Use /goodbye on or /goodbye off.");
    }
});

// Welcome new members
bot.on("new_chat_members", (ctx) => {
    if (ctx.chat.type === "private") return;

    const chatId = ctx.chat.id;
    const settings = groupSettings.get(chatId) || { welcome: true }; // Default ON

    if (settings.welcome) {
        ctx.message.new_chat_members.forEach((member) => {
            ctx.reply(`👋 Welcome @${member.username || member.first_name}!`);
        });
    }
});

// Say goodbye when a member leaves
bot.on("left_chat_member", (ctx) => {
    if (ctx.chat.type === "private") return;

    const chatId = ctx.chat.id;
    const settings = groupSettings.get(chatId) || { goodbye: true }; // Default ON

    if (settings.goodbye) {
        ctx.reply(`👋 Goodbye @${ctx.message.left_chat_member.username || ctx.message.left_chat_member.first_name}!`);
    }
});

bot.command("accept", (ctx) => {
    const acceptingUser = `@${ctx.from.username}`;
    
    if (games.has(acceptingUser)) {
        const { challenger, chatId } = games.get(acceptingUser);

        if (ctx.chat.id !== chatId) {
            return ctx.reply("This challenge is not for this chat.");
        }

        const board = [
            ["⬜", "⬜", "⬜"],
            ["⬜", "⬜", "⬜"],
            ["⬜", "⬜", "⬜"]
        ];

        const gameData = {
            playerX: challenger,
            playerO: ctx.from.id,
            currentTurn: challenger,
            board
        };

        games.set(ctx.chat.id, gameData);
        sendBoard(ctx, gameData);
    } else {
        ctx.reply("No active Tic-Tac-Toe challenge found.");
    }
});

function sendBoard(ctx, gameData) {
    const { board, currentTurn } = gameData;
    const keyboard = board.map((row, rowIndex) =>
        row.map((cell, colIndex) =>
            Markup.button.callback(cell, `move_${rowIndex}_${colIndex}`)
        )
    );

    ctx.reply(`Tic-Tac-Toe Game!\n${currentTurn === gameData.playerX ? "❌" : "⭕"}'s turn!`, Markup.inlineKeyboard(keyboard));
}

bot.action(/^move_(\d)_(\d)$/, async (ctx) => {
    const match = ctx.match;
    const row = parseInt(match[1]);
    const col = parseInt(match[2]);
    const chatId = ctx.chat.id;

    if (!games.has(chatId)) return ctx.answerCbQuery("No active game!");

    const gameData = games.get(chatId);
    const { board, currentTurn, playerX, playerO } = gameData;

    if (ctx.from.id !== currentTurn) return ctx.answerCbQuery("Not your turn!");

    if (board[row][col] !== "⬜") return ctx.answerCbQuery("Invalid move!");

    board[row][col] = currentTurn === playerX ? "❌" : "⭕";
    gameData.currentTurn = currentTurn === playerX ? playerO : playerX;

    if (checkWinner(board)) {
        ctx.editMessageText(`Game Over! ${currentTurn === playerX ? "❌" : "⭕"} Wins!`);
        games.delete(chatId);
    } else if (board.flat().every(cell => cell !== "⬜")) {
        ctx.editMessageText("It's a draw!");
        games.delete(chatId);
    } else {
        games.set(chatId, gameData);
        sendBoard(ctx, gameData);
    }
    ctx.answerCbQuery();
});

function checkWinner(board) {
    const lines = [
        [board[0][0], board[0][1], board[0][2]],
        [board[1][0], board[1][1], board[1][2]],
        [board[2][0], board[2][1], board[2][2]],
        [board[0][0], board[1][0], board[2][0]],
        [board[0][1], board[1][1], board[2][1]],
        [board[0][2], board[1][2], board[2][2]],
        [board[0][0], board[1][1], board[2][2]],
        [board[0][2], board[1][1], board[2][0]]
    ];
    return lines.some(line => line.every(cell => cell === "❌") || line.every(cell => cell === "⭕"));
}

// Admin Commands

bot.command("kick", async (ctx) => {
    if (!ctx.message.reply_to_message) return ctx.reply("Reply to a user's message to kick them.");
    if (!(await isAdmin(ctx, ctx.from.id))) return ctx.reply("You must be an admin to use this command.");

    try {
        await ctx.telegram.kickChatMember(ctx.chat.id, ctx.message.reply_to_message.from.id);
        ctx.reply("User has been kicked.");
    } catch {
        ctx.reply("Failed to kick user. Check my permissions.");
    }
});

bot.command("promote", async (ctx) => {
    if (!ctx.message.reply_to_message) return ctx.reply("Reply to a user's message to promote them.");
    if (!(await isAdmin(ctx, ctx.from.id))) return ctx.reply("You must be an admin to use this command.");

    try {
        await ctx.telegram.promoteChatMember(ctx.chat.id, ctx.message.reply_to_message.from.id, { can_manage_chat: true });
        ctx.reply("User has been promoted.");
    } catch {
        ctx.reply("Failed to promote user. Check my permissions.");
    }
});

bot.command("demote", async (ctx) => {
    if (!ctx.message.reply_to_message) return ctx.reply("Reply to a user's message to demote them.");
    if (!(await isAdmin(ctx, ctx.from.id))) return ctx.reply("You must be an admin to use this command.");

    try {
        await ctx.telegram.promoteChatMember(ctx.chat.id, ctx.message.reply_to_message.from.id, { can_manage_chat: false });
        ctx.reply("User has been demoted.");
    } catch {
        ctx.reply("Failed to demote user. Check my permissions.");
    }
});

bot.command("calculate", (ctx) => {
    const expression = ctx.message.text.split(" ").slice(1).join(" ");
    
    if (!expression) {
        return ctx.reply("Please provide a mathematical expression. Example: /calculate 297*53");
    }

    try {
        const result = eval(expression);
        ctx.reply(`🧮 Result: ${result}`);
    } catch (error) {
        ctx.reply("Invalid mathematical expression!");
    }
});

const botOwner = "kingkhalid246"; // Change this to your Telegram username

// /transfer @username [amount] - Transfer coins
bot.command("transfer", (ctx) => {
    const args = ctx.message.text.split(" ");
    if (args.length < 3 || !ctx.message.reply_to_message) {
        return ctx.reply("❌ Usage: Reply to a user with /transfer [amount]");
    }

    const senderId = ctx.from.id;
    const receiverId = ctx.message.reply_to_message.from.id;
    const receiverUsername = ctx.message.reply_to_message.from.username || ctx.message.reply_to_message.from.first_name;
    const amount = parseInt(args[2]);

    if (isNaN(amount) || amount <= 0) {
        return ctx.reply("❌ Enter a valid amount to transfer.");
    }

    const sender = getUser(senderId);
    const receiver = getUser(receiverId);

    if (sender.balance < amount) {
        return ctx.reply("❌ You don't have enough coins.");
    }

    sender.balance -= amount;
    receiver.balance += amount;

    ctx.reply(`✅ You transferred ${amount} coins to @${receiverUsername}!`);
});

// /users - Show all users who used the bot (Only for bot owner)
bot.command("users", (ctx) => {
    if (ctx.from.username !== botOwner) {
        return ctx.reply("❌ Only the bot owner can use this command.");
    }

    if (users.size === 0) {
        return ctx.reply("No users have interacted with the bot yet.");
    }

    let userList = "👥 **Users List:**\n";
    users.forEach((data, userId) => {
        userList += `🆔 ${userId}\n`;
    });

    ctx.reply(userList);
});

// /leaderboard - Show top users with the most coins (Only for bot owner)
bot.command("leaderboard", (ctx) => {
    if (ctx.from.username !== botOwner) {
        return ctx.reply("❌ Only the bot owner can use this command.");
    }

    if (users.size === 0) {
        return ctx.reply("No users have earned coins yet.");
    }

    const leaderboard = [...users.entries()]
        .sort((a, b) => b[1].balance - a[1].balance)
        .slice(0, 10)
        .map(([id, data], index) => `${index + 1}. 🆔 ${id} - 💰 ${data.balance} coins`)
        .join("\n");

    ctx.reply(`🏆 **Leaderboard:**\n${leaderboard}`);
});

const yts = require('yt-search');
const ytdl = require('ytdl-core');
const fs = require('fs');

bot.command('song', async (ctx) => {
    const query = ctx.message.text.split(' ').slice(1).join(' ');
    if (!query) {
        return ctx.reply('❌ Please provide a song name. Example: /song shape of you');
    }

    ctx.reply(`🔍 Searching for "${query}"...`);

    try {
        const searchResults = await yts(query);
        const video = searchResults.videos[0];

        if (!video) {
            return ctx.reply('❌ No results found.');
        }

        const url = video.url;
        const title = video.title;

        ctx.reply(`🎶 Downloading **${title}**...`);

        const stream = ytdl(url, { filter: 'audioonly' });
        const filePath = `./${title}.mp3`;
        const writeStream = fs.createWriteStream(filePath);

        stream.pipe(writeStream);

        writeStream.on('finish', async () => {
            await ctx.replyWithAudio({ source: filePath });
            fs.unlinkSync(filePath); // Delete file after sending
        });
    } catch (error) {
        console.error(error);
        ctx.reply('❌ Error downloading the song.');
    }
});

bot.launch();
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
