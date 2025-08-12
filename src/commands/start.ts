import { Telegraf, Markup, Scenes } from 'telegraf';
import { PrismaClient } from '../../prisma-client';
import { handleAddListing } from './add';
import { handleBrowseListings } from './browse';
import { handleMyListings } from './mylistings';
import { BotContext } from '../types/context';

// Main menu function that can be called from anywhere
export async function showMainMenu(ctx: BotContext) {
  await ctx.reply(
    `🎸 *GearTrader Main Menu*\n\n` +
    `Choose what you'd like to do:`,
    {
      parse_mode: 'Markdown',
      reply_markup: Markup.inlineKeyboard([
        [Markup.button.callback('🎛 Browse Listings', 'browse_listings')],
        [Markup.button.callback('➕ Add New Listing', 'add_listing')],
        [Markup.button.callback('📦 My Listings', 'my_listings')],
        [Markup.button.callback('ℹ️ Help & Info', 'help_info')],
      ]).reply_markup
    }
  );
}

export function registerStartCommand(bot: Telegraf<BotContext>, prisma: PrismaClient) {
  // Welcome new users automatically
  bot.on('new_chat_members', async (ctx) => {
    if (ctx.chat?.type !== 'private') return;
    
    // Check if the new member is the bot itself
    const newMember = ctx.message.new_chat_members[0];
    if (newMember.is_bot && newMember.id === ctx.botInfo?.id) {
      await ctx.reply(
        `🎸 *Welcome to GearTrader!*\n\n` +
        `This bot helps you trade musical gear (no money involved).\n\n` +
        `🔒 *Privacy Notice:*\n` +
        `Your contact info and user data are stored *only while your listing is live*.\n` +
        `As soon as you delete your last listing, all your data is permanently deleted.\n` +
        `No personal information is retained longer than necessary.\n\n` +
        `Here's your main menu:`,
        { parse_mode: 'Markdown' }
      );
      await showMainMenu(ctx);
    }
  });

  // Start command shows welcome message and main menu
  bot.start(async (ctx) => {
    if (ctx.chat?.type !== 'private') return;
    await ctx.reply(
      `Welcome to GearTrader! 🎸\n\n` +
      `This bot helps you trade musical gear (no money involved).\n\n` +
      `🔒 *Privacy Notice:*\n` +
      `Your contact info and user data are stored *only while your listing is live*.\n` +
      `As soon as you delete your last listing, all your data is permanently deleted.\n` +
      `No personal information is retained longer than necessary.\n\n` +
      `Here's your main menu:`,
      { parse_mode: 'Markdown' }
    );
    
    // Show the main menu
    await showMainMenu(ctx);
  });

  // Menu command to show main menu anytime
  bot.command('menu', async (ctx) => {
    if (ctx.chat?.type !== 'private') return;
    await showMainMenu(ctx);
  });

  // Catch-all message handler - show menu for any text message
  bot.on('text', async (ctx) => {
    if (ctx.chat?.type !== 'private') return;
    
    // If it's not a command, show the main menu
    if (!ctx.message.text.startsWith('/')) {
      await ctx.reply(
        `🎸 *Welcome to GearTrader!*\n\n` +
        `Here's what you can do:`,
        { parse_mode: 'Markdown' }
      );
      await showMainMenu(ctx);
    }
  });

  // Handle menu button actions
  bot.action('browse_listings', async (ctx) => {
    await ctx.answerCbQuery();
    await handleBrowseListings(ctx, prisma, 0);
  });

  bot.action('add_listing', async (ctx) => {
    await ctx.answerCbQuery();
    await handleAddListing(ctx);
  });

  bot.action('my_listings', async (ctx) => {
    await ctx.answerCbQuery();
    await handleMyListings(ctx, prisma);
  });

  bot.action('help_info', async (ctx) => {
    await ctx.answerCbQuery();
    await ctx.reply(
      `🎸 *GearTrader Help*\n\n` +
      `*Commands:*\n` +
      `• /start - Show main menu\n` +
      `• /menu - Show main menu\n` +
      `• /add - Add new listing\n` +
      `• /browse - Browse all listings\n` +
      `• /listings - View all listings\n` +
      `• /mylistings - Manage your listings\n\n` +
      `*Features:*\n` +
      `• Add listings with photos\n` +
      `• Browse and search listings\n` +
      `• Contact sellers directly\n` +
      `• Manage your own listings\n\n` +
      `*Privacy:* Your data is only stored while your listings are active.`,
      {
        parse_mode: 'Markdown',
        reply_markup: Markup.inlineKeyboard([
          [Markup.button.callback('🔙 Back to Menu', 'back_to_menu')],
        ]).reply_markup
      }
    );
  });

  bot.action('back_to_menu', async (ctx) => {
    await ctx.answerCbQuery();
    await showMainMenu(ctx);
  });
} 