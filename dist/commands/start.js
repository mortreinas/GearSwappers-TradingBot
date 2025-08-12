"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.registerStartCommand = registerStartCommand;
const telegraf_1 = require("telegraf");
const add_1 = require("./add");
const browse_1 = require("./browse");
const mylistings_1 = require("./mylistings");
function registerStartCommand(bot, prisma) {
    bot.start(async (ctx) => {
        if (ctx.chat?.type !== 'private')
            return;
        await ctx.reply(`Welcome to GearTrader!\n\n` +
            `This bot helps you trade musical gear (no money involved).\n\n` +
            `You can use the buttons below or the following commands:\n` +
            `• /browse — Browse all listings\n` +
            `• /add — Add a new listing (multi-step wizard)\n` +
            `• /mylistings — View, edit, or delete your listings\n` +
            `• /listings — See all listings as a quick list\n\n` +
            `Buttons do the same as the commands for quick access.\n\n` +
            `🔒 *Privacy Notice:*\n` +
            `Your contact info and user data are stored *only while your listing is live*.\n` +
            `As soon as you delete your last listing, all your data is permanently deleted.\n` +
            `No personal information is retained longer than necessary.`, {
            parse_mode: 'Markdown',
            reply_markup: telegraf_1.Markup.inlineKeyboard([
                [telegraf_1.Markup.button.callback('🎛 Browse Listings', 'browse_listings')],
                [telegraf_1.Markup.button.callback('➕ Add Listing', 'add_listing')],
                [telegraf_1.Markup.button.callback('📦 My Listings', 'my_listings')],
                [telegraf_1.Markup.button.callback('📃 All Listings', 'all_listings')],
            ]).reply_markup
        });
    });
    bot.action('browse_listings', async (ctx) => {
        console.log('Browse Listings button pressed');
        await ctx.answerCbQuery();
        await (0, browse_1.handleBrowseListings)(ctx, prisma, 0);
    });
    bot.action('add_listing', async (ctx) => {
        console.log('Add Listing button pressed');
        await ctx.answerCbQuery();
        await (0, add_1.handleAddListing)(ctx);
    });
    bot.action('my_listings', async (ctx) => {
        console.log('My Listings button pressed');
        await ctx.answerCbQuery();
        await (0, mylistings_1.handleMyListings)(ctx, prisma);
    });
    bot.action('all_listings', async (ctx) => {
        console.log('All Listings button pressed');
        await ctx.answerCbQuery();
        if (ctx.chat?.id) {
            await ctx.telegram.sendMessage(ctx.chat.id, '/listings');
        }
    });
}
