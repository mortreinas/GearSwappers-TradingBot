import { Telegraf, Markup, Scenes } from 'telegraf';
import { PrismaClient } from '../../prisma-client';
import { handleAddListing } from './add';
import { handleBrowseListings } from './browse';
import { handleMyListings } from './mylistings';
import { BotContext } from '../types/context';

export function registerStartCommand(bot: Telegraf<BotContext>, prisma: PrismaClient) {
  bot.start(async (ctx) => {
    if (ctx.chat?.type !== 'private') return;
    await ctx.reply(
      `Welcome to GearTrader!\n\n` +
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
      `No personal information is retained longer than necessary.`,
      {
        parse_mode: 'Markdown',
        reply_markup: Markup.inlineKeyboard([
          [Markup.button.callback('🎛 Browse Listings', 'browse_listings')],
          [Markup.button.callback('➕ Add Listing', 'add_listing')],
          [Markup.button.callback('📦 My Listings', 'my_listings')],
          [Markup.button.callback('📃 All Listings', 'all_listings')],
        ]).reply_markup
      }
    );
  });

  bot.action('browse_listings', async (ctx) => {
    console.log('Browse Listings button pressed');
    await ctx.answerCbQuery();
    await handleBrowseListings(ctx, prisma, 0);
  });
  bot.action('add_listing', async (ctx) => {
    console.log('Add Listing button pressed');
    await ctx.answerCbQuery();
    await handleAddListing(ctx);
  });
  bot.action('my_listings', async (ctx) => {
    console.log('My Listings button pressed');
    await ctx.answerCbQuery();
    await handleMyListings(ctx, prisma);
  });
  bot.action('all_listings', async (ctx) => {
    console.log('All Listings button pressed');
    await ctx.answerCbQuery();
    if (ctx.chat?.id) {
      await ctx.telegram.sendMessage(ctx.chat.id, '/listings');
    }
  });
} 