import { Telegraf, Markup, Scenes } from 'telegraf';
import { PrismaClient } from '../../prisma-client';
import { BotContext } from '../types/context';
import { showMainMenu } from './start';

const PAGE_SIZE = 3;

export async function handleBrowseListings(ctx: BotContext, prisma: PrismaClient, page = 0) {
  try {
    console.log('sendListings called, page:', page);
    const listings = await prisma.listing.findMany({
      orderBy: { createdAt: 'desc' },
      skip: page * PAGE_SIZE,
      take: PAGE_SIZE,
      include: { user: true },
    });
    if (!listings.length) {
      await ctx.reply('No listings found.', {
        reply_markup: Markup.inlineKeyboard([
          [Markup.button.callback('🔙 Back to Menu', 'back_to_menu')],
        ]).reply_markup
      });
      return;
    }
    
    // Show only the first listing from this page
    const listing = listings[0];
    const photos = JSON.parse(listing.photos || '[]');
    let msg = `*${listing.title}*\n${listing.description}\n`;
    if (listing.price) msg += `\n💵 Price: ${listing.price}`;
    msg += `\n📍 Location: ${listing.location}`;
    msg += `\n📞 Contact: ${listing.user.contact}`;
    msg += `\n\n📄 Page ${page + 1} of ${Math.ceil((await prisma.listing.count()) / PAGE_SIZE)}`;
    
    if (photos.length > 0) {
      // Show all photos in a grouped media message
      const mediaGroup = photos.map((fileId: string, i: number) => ({
        type: 'photo',
        media: fileId,
        ...(i === 0 ? { caption: msg, parse_mode: 'Markdown' } : {})
      }));
      
      await ctx.replyWithMediaGroup(mediaGroup);
    } else {
      // No photos, just show the text
      await ctx.reply(msg, { parse_mode: 'Markdown' });
    }
    
    // Add navigation buttons inline with the listing
    const totalListings = await prisma.listing.count();
    const totalPages = Math.ceil(totalListings / PAGE_SIZE);
    
    const navigationButtons = [];
    if (page > 0) {
      navigationButtons.push(Markup.button.callback('⬅️ Prev', `browse_prev_${page}`));
    }
    if (page < totalPages - 1) {
      navigationButtons.push(Markup.button.callback('➡️ Next', `browse_next_${page}`));
    }
    
    if (navigationButtons.length > 0) {
      await ctx.reply('Navigate:', Markup.inlineKeyboard([
        navigationButtons,
        [Markup.button.callback('🔙 Back to Menu', 'back_to_menu')]
      ]));
    } else {
      await ctx.reply('Navigation:', Markup.inlineKeyboard([
        [Markup.button.callback('🔙 Back to Menu', 'back_to_menu')]
      ]));
    }
  } catch (error) {
    console.error('Error in handleBrowseListings:', error);
    await ctx.reply('Sorry, there was an error loading the listings. Please try again.', {
      reply_markup: Markup.inlineKeyboard([
        [Markup.button.callback('🔙 Back to Menu', 'back_to_menu')],
      ]).reply_markup
    });
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