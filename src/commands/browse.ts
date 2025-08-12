import { Telegraf, Markup, Scenes } from 'telegraf';
import { PrismaClient } from '../../prisma-client';
import { BotContext } from '../types/context';
import { showMainMenu } from './start';

// Helper function to clean up old bot messages and start fresh
async function cleanBotMessages(ctx: BotContext) {
  try {
    // Clear session data
    if (ctx.session) {
      (ctx.session as any).mainMessageId = undefined;
      (ctx.session as any).wizardMessageIds = [];
      (ctx.session as any).navigationMessageId = undefined;
    }
    
    // Try to delete the main message if it exists
    if (ctx.session && (ctx.session as any).mainMessageId) {
      try {
        await ctx.telegram.deleteMessage(ctx.chat!.id, (ctx.session as any).mainMessageId);
      } catch (error) {
        console.log('Could not delete main message:', error);
      }
    }
    
    // Try to delete navigation message if it exists
    if (ctx.session && (ctx.session as any).navigationMessageId) {
      try {
        await ctx.telegram.deleteMessage(ctx.chat!.id, (ctx.session as any).navigationMessageId);
      } catch (error) {
        console.log('Could not delete navigation message:', error);
      }
    }
    
    // Try to delete wizard messages if they exist
    if (ctx.session && (ctx.session as any).wizardMessageIds) {
      for (const messageId of (ctx.session as any).wizardMessageIds) {
        try {
          await ctx.telegram.deleteMessage(ctx.chat!.id, messageId);
        } catch (error) {
          console.log('Could not delete wizard message:', error);
        }
      }
      (ctx.session as any).wizardMessageIds = [];
    }
    
    console.log('Cleaned up old bot messages');
  } catch (error) {
    console.error('Error cleaning bot messages:', error);
  }
}

const PAGE_SIZE = 3;

export async function handleBrowseListings(ctx: BotContext, prisma: PrismaClient) {
  try {
    if (ctx.chat?.type !== 'private') return;
    
    // Clean slate: Delete old bot messages and start fresh
    await cleanBotMessages(ctx);
    
    const listings = await prisma.listing.findMany({
      orderBy: { createdAt: 'desc' },
      include: { user: true },
    });
    if (!listings.length) {
      const noListingsText = `📭 *No Listings Found*\n\nNo listings available to browse.`;
      const noListingsButtons = Markup.inlineKeyboard([
        [Markup.button.callback('🔙 Back to Menu', 'back_to_menu')],
      ]).reply_markup;
      
      // Always send a fresh message with interactive menu
      const sent = await ctx.reply(noListingsText, { 
        parse_mode: 'Markdown', 
        reply_markup: noListingsButtons 
      });
      
      // Store this as the main interactive message
      if (!ctx.session) (ctx as any).session = {};
      (ctx.session as any).mainMessageId = sent.message_id;
      return;
    }
    
    // Show only the first listing from this page
    const listing = listings[0];
    const photos = JSON.parse(listing.photos || '[]');
    let msg = `*${listing.title}*\n${listing.description}\n`;
    if (listing.price) msg += `\n💵 Price: ${listing.price}`;
    msg += `\n📍 Location: ${listing.location}`;
    if (listing.marketplaceLink) msg += `\n🔗 [Marketplace Link](${listing.marketplaceLink})`;
    msg += `\n📞 Contact: ${listing.user.contact}`;
    msg += `\n\n📄 Page ${page + 1} of ${Math.ceil((await prisma.listing.count()) / PAGE_SIZE)}`;
    
    const buttons = [];
    if (page > 0) buttons.push(Markup.button.callback('⬅️ Previous', `browse_${page - 1}`));
    if (page < Math.ceil((await prisma.listing.count()) / PAGE_SIZE) - 1) buttons.push(Markup.button.callback('Next ➡️', `browse_${page + 1}`));
    
    const actionButtons = [];
    if (buttons.length > 0) actionButtons.push(buttons);
    actionButtons.push([Markup.button.callback('🔙 Back to Menu', 'back_to_menu')]);
    
    const replyMarkup = Markup.inlineKeyboard(actionButtons).reply_markup;
    
    // Show the listing with photos first (can't be edited)
    if (photos.length > 0) {
      const mediaGroup = photos.map((fileId: string, i: number) => ({
        type: 'photo', media: fileId,
        ...(i === 0 ? { caption: msg, parse_mode: 'Markdown' } : {})
      }));
      await ctx.replyWithMediaGroup(mediaGroup);
    } else {
      // No photos, just send the listing text
      await ctx.reply(msg, { parse_mode: 'Markdown' });
    }
    
    // Always send a fresh interactive navigation menu as the LAST message
    const navigationMessage = await ctx.reply('Navigation:', { reply_markup: replyMarkup });
    
    // Store this navigation message ID for future editing
    if (!ctx.session) (ctx as any).session = {};
    (ctx.session as any).navigationMessageId = navigationMessage.message_id;
  } catch (error) {
    console.error('Error in handleBrowseListings:', error);
    const errorText = `❌ *Error*\n\nSorry, there was an error loading the listings. Please try again.`;
    const errorButtons = Markup.inlineKeyboard([
      [Markup.button.callback('🔙 Back to Menu', 'back_to_menu')],
    ]).reply_markup;
    
    // Always send a fresh error message with interactive menu
    const sent = await ctx.reply(errorText, { 
      parse_mode: 'Markdown', 
      reply_markup: errorButtons 
    });
    
    // Store this as the main interactive message
    if (!ctx.session) (ctx as any).session = {};
    (ctx.session as any).mainMessageId = sent.message_id;
  }
}

export function registerBrowseListingsCommand(bot: Telegraf<BotContext>, prisma: PrismaClient) {
  bot.command('browse', async (ctx) => {
    try {
      console.log('/browse command triggered');
      if (ctx.chat?.type !== 'private') return;
      await handleBrowseListings(ctx, prisma, 0);
    } catch (error) {
      console.error('Error in browse command:', error);
      await ctx.reply('Sorry, there was an error. Please try again.', {
        reply_markup: Markup.inlineKeyboard([
          [Markup.button.callback('🔙 Back to Menu', 'back_to_menu')],
        ]).reply_markup
      });
    }
  });
  bot.action(/browse_next_(\d+)/, async (ctx) => {
    try {
      const page = parseInt(ctx.match[1], 10) + 1;
      await handleBrowseListings(ctx, prisma, page);
      await ctx.answerCbQuery();
    } catch (error) {
      console.error('Error in browse_next action:', error);
      await ctx.answerCbQuery('Error loading next page');
    }
  });
  bot.action(/browse_prev_(\d+)/, async (ctx) => {
    try {
      const page = Math.max(0, parseInt(ctx.match[1], 10) - 1);
      await handleBrowseListings(ctx, prisma, page);
      await ctx.answerCbQuery();
    } catch (error) {
      console.error('Error in browse_prev action:', error);
      await ctx.answerCbQuery('Error loading previous page');
    }
  });
} 