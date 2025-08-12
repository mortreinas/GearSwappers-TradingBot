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
        [Markup.button.callback('📃 Quick Listings View', 'quick_listings')],
        [Markup.button.callback('ℹ️ Help & Info', 'help_info')],
      ]).reply_markup
    }
  );
}

export function registerStartCommand(bot: Telegraf<BotContext>, prisma: PrismaClient) {
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

  // Menu button actions
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
  
  bot.action('quick_listings', async (ctx) => {
    console.log('Quick Listings button pressed');
    await ctx.answerCbQuery();
    // This will trigger the /listings command functionality
    await ctx.reply('📋 Quick listings view:', {
      reply_markup: Markup.inlineKeyboard([
        [Markup.button.callback('📋 Show All Listings', 'show_all_listings')],
        [Markup.button.callback('🔙 Back to Menu', 'back_to_menu')],
      ]).reply_markup
    });
  });
  
  bot.action('help_info', async (ctx) => {
    console.log('Help Info button pressed');
    await ctx.answerCbQuery();
    await ctx.reply(
      `ℹ️ *GearTrader Help*\n\n` +
      `*Commands:*\n` +
      `• /start - Show this menu\n` +
      `• /menu - Show main menu\n` +
      `• /browse - Browse all listings\n` +
      `• /add - Add new listing\n` +
      `• /mylistings - Manage your listings\n` +
      `• /listings - Quick listings view\n\n` +
      `*How to use:*\n` +
      `1. Use /add to create a new listing\n` +
      `2. Use /browse to see what others are offering\n` +
      `3. Use /mylistings to manage your listings\n\n` +
      `*Privacy:* Your data is only stored while you have active listings.`,
      {
        parse_mode: 'Markdown',
        reply_markup: Markup.inlineKeyboard([
          [Markup.button.callback('🔙 Back to Menu', 'back_to_menu')],
        ]).reply_markup
      }
    );
  });
  
  bot.action('show_all_listings', async (ctx) => {
    console.log('Show All Listings button pressed');
    await ctx.answerCbQuery();
    // Import and call the listings functionality
    const { registerGroupListingsCommand } = require('./listings');
    // This is a bit hacky, let me create a better approach
    await ctx.reply('Use /listings command to see all listings, or use the Browse Listings option above.');
  });
  
  bot.action('back_to_menu', async (ctx) => {
    console.log('Back to Menu button pressed');
    await ctx.answerCbQuery();
    await showMainMenu(ctx);
  });
} 