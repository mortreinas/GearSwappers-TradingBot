import { Telegraf, Markup, Scenes } from 'telegraf';
import { PrismaClient } from '../../prisma-client';
import { handleAddListing } from './add';
import { handleBrowseListings } from './browse';
import { handleMyListings } from './mylistings';
import { BotContext } from '../types/context';

// Main menu function that can be called from anywhere
export async function showMainMenu(ctx: BotContext) {
  const menuText = `🎸 *GearTrader Main Menu*\n\nChoose what you'd like to do:`;
  const menuButtons = Markup.inlineKeyboard([
    [Markup.button.callback('🎛 Browse Listings', 'browse_listings')],
    [Markup.button.callback('➕ Add New Listing', 'add_listing')],
    [Markup.button.callback('📦 My Listings', 'my_listings')],
    [Markup.button.callback('ℹ️ Help & Info', 'help_info')],
  ]).reply_markup;

  // If we have a main message to update, edit it
  if (ctx.session && (ctx.session as any).mainMessageId) {
    try {
      await ctx.telegram.editMessageText(
        ctx.chat!.id,
        (ctx.session as any).mainMessageId,
        undefined,
        menuText,
        { parse_mode: 'Markdown', reply_markup: menuButtons }
      );
      return;
    } catch (error) {
      console.log('Failed to edit message, sending new one');
    }
  }

  // Send new message and store its ID
  const sent = await ctx.reply(menuText, {
    parse_mode: 'Markdown',
    reply_markup: menuButtons
  });
  
  // Initialize session if it doesn't exist
  if (!ctx.session) {
    (ctx as any).session = {};
  }
  (ctx.session as any).mainMessageId = sent.message_id;
}

export function registerStartCommand(bot: Telegraf<BotContext>, prisma: PrismaClient) {
  // Start command shows welcome message and main menu
  bot.start(async (ctx) => {
    if (ctx.chat?.type !== 'private') return;
    
    // Send welcome message
    await ctx.reply(
      `Welcome to GearTrader! 🎸\n\n` +
      `This bot helps you trade musical gear (no money involved).\n\n` +
      `🔒 *Privacy Notice:*\n` +
      `Your contact info and user data are stored *only while your listing is live*.\n` +
      `As soon as you delete your last listing, all your data is permanently deleted.\n` +
      `No personal information is retained longer than necessary.`,
      { parse_mode: 'Markdown' }
    );
    
    // Show the main menu (this will be the main updatable message)
    await showMainMenu(ctx);
  });

  // Menu command to show main menu anytime
  bot.command('menu', async (ctx) => {
    if (ctx.chat?.type !== 'private') return;
    await showMainMenu(ctx);
  });

  // Handle menu button actions
  bot.action('browse_listings', async (ctx) => {
    await ctx.answerCbQuery();
    
    try {
      const listings = await prisma.listing.findMany({
        orderBy: { createdAt: 'desc' },
        include: { user: true },
      });
      
      if (!listings.length) {
        // Update the main message to show no listings
        const noListingsText = `📭 *No Listings Found*\n\nBe the first to add one! 🎸`;
        const noListingsButtons = Markup.inlineKeyboard([
          [Markup.button.callback('➕ Add New Listing', 'add_listing')],
          [Markup.button.callback('🔙 Back to Menu', 'back_to_menu')],
        ]).reply_markup;
        
        if (ctx.session && (ctx.session as any).mainMessageId) {
          await ctx.telegram.editMessageText(
            ctx.chat!.id,
            (ctx.session as any).mainMessageId,
            undefined,
            noListingsText,
            { parse_mode: 'Markdown', reply_markup: noListingsButtons }
          );
        } else {
          await ctx.reply(noListingsText, { reply_markup: noListingsButtons });
        }
        return;
      }
      
      // Show all as buttons: just the title
      const buttons = listings.map(listing => {
        return [Markup.button.callback(listing.title, `show_listing_${listing.id}`)];
      });
      
      // Add back to menu button
      buttons.push([Markup.button.callback('🔙 Back to Menu', 'back_to_menu')]);
      
      // Update the main message to show listings
      const listingsText = `📋 *Available Listings*\n\nFound ${listings.length} listings. Select one to view details:`;
      const listingsButtons = Markup.inlineKeyboard(buttons).reply_markup;
      
      if (ctx.session && (ctx.session as any).mainMessageId) {
        await ctx.telegram.editMessageText(
          ctx.chat!.id,
          (ctx.session as any).mainMessageId,
          undefined,
          listingsText,
          { parse_mode: 'Markdown', reply_markup: listingsButtons }
        );
      } else {
        await ctx.reply(listingsText, { reply_markup: listingsButtons });
      }
    } catch (error) {
      console.error('Error loading listings:', error);
      const errorText = `❌ *Error*\n\nSorry, there was an error loading the listings. Please try again.`;
      const errorButtons = Markup.inlineKeyboard([
        [Markup.button.callback('🔙 Back to Menu', 'back_to_menu')],
      ]).reply_markup;
      
      if (ctx.session && (ctx.session as any).mainMessageId) {
        await ctx.telegram.editMessageText(
          ctx.chat!.id,
          (ctx.session as any).mainMessageId,
          undefined,
          errorText,
          { parse_mode: 'Markdown', reply_markup: errorButtons }
        );
      } else {
        await ctx.reply(errorText, { reply_markup: errorButtons });
      }
    }
  });

  bot.action('add_listing', async (ctx) => {
    await ctx.answerCbQuery();
    await handleAddListing(ctx);
  });

  bot.action('my_listings', async (ctx) => {
    await ctx.answerCbQuery();
    
    try {
      const user = await prisma.user.findUnique({ 
        where: { telegramId: String(ctx.from?.id) }, 
        include: { listings: true } 
      });
      
      if (!user || !user.listings.length) {
        const noListingsText = `📦 *My Listings*\n\nYou have no listings.`;
        const noListingsButtons = Markup.inlineKeyboard([
          [Markup.button.callback('➕ Add Your First Listing', 'add_listing')],
          [Markup.button.callback('🔙 Back to Menu', 'back_to_menu')],
        ]).reply_markup;
        
        if (ctx.session && (ctx.session as any).mainMessageId) {
          await ctx.telegram.editMessageText(
            ctx.chat!.id,
            (ctx.session as any).mainMessageId,
            undefined,
            noListingsText,
            { parse_mode: 'Markdown', reply_markup: noListingsButtons }
          );
        } else {
          await ctx.reply(noListingsText, { reply_markup: noListingsButtons });
        }
        return;
      }
      
      // Create buttons for user's listings
      const listingButtons = user.listings.map(listing => [
        Markup.button.callback(`✏️ ${listing.title}`, `edit_listing_${listing.id}`),
        Markup.button.callback(`🗑️ ${listing.title}`, `delete_listing_${listing.id}`)
      ]);
      
      // Add management buttons
      listingButtons.push([Markup.button.callback('➕ Add New Listing', 'add_listing')]);
      listingButtons.push([Markup.button.callback('🔙 Back to Menu', 'back_to_menu')]);
      
      const myListingsText = `📦 *My Listings*\n\nManage your ${user.listings.length} listing(s):`;
      const myListingsButtons = Markup.inlineKeyboard(listingButtons).reply_markup;
      
      if (ctx.session && (ctx.session as any).mainMessageId) {
        await ctx.telegram.editMessageText(
          ctx.chat!.id,
          (ctx.session as any).mainMessageId,
          undefined,
          myListingsText,
          { parse_mode: 'Markdown', reply_markup: myListingsButtons }
        );
      } else {
        await ctx.reply(myListingsText, { reply_markup: myListingsButtons });
      }
    } catch (error) {
      console.error('Error loading my listings:', error);
      const errorText = `❌ *Error*\n\nSorry, there was an error loading your listings. Please try again.`;
      const errorButtons = Markup.inlineKeyboard([
        [Markup.button.callback('🔙 Back to Menu', 'back_to_menu')],
      ]).reply_markup;
      
      if (ctx.session && (ctx.session as any).mainMessageId) {
        await ctx.telegram.editMessageText(
          ctx.chat!.id,
          (ctx.session as any).mainMessageId,
          undefined,
          errorText,
          { parse_mode: 'Markdown', reply_markup: errorButtons }
        );
      } else {
        await ctx.reply(errorText, { reply_markup: errorButtons });
      }
    }
  });

  bot.action('help_info', async (ctx) => {
    await ctx.answerCbQuery();
    
    const helpText = `🎸 *GearTrader Help*\n\n` +
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
      `*Privacy:* Your data is only stored while your listings are active.`;
    
    const helpButtons = Markup.inlineKeyboard([
      [Markup.button.callback('🔙 Back to Menu', 'back_to_menu')],
    ]).reply_markup;
    
    if (ctx.session && (ctx.session as any).mainMessageId) {
      await ctx.telegram.editMessageText(
        ctx.chat!.id,
        (ctx.session as any).mainMessageId,
        undefined,
        helpText,
        { parse_mode: 'Markdown', reply_markup: helpButtons }
      );
    } else {
      await ctx.reply(helpText, { reply_markup: helpButtons });
    }
  });

  bot.action('back_to_menu', async (ctx) => {
    await ctx.answerCbQuery();
    await showMainMenu(ctx);
  });
} 