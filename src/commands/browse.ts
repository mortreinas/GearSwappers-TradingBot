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
      const noListingsText = `📭 *No Listings Found*\n\nNo listings available to browse.`;
      const noListingsButtons = Markup.inlineKeyboard([
        [Markup.button.callback('🔙 Back to Menu', 'back_to_menu')],
      ]).reply_markup;
      
      if ((ctx.session as any).mainMessageId) {
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
    buttons.push([Markup.button.callback('🔙 Back to Menu', 'back_to_menu')]);
    
    const replyMarkup = Markup.inlineKeyboard(buttons).reply_markup;
    
    // Edit the main message to show the listing
    if (ctx.session && (ctx.session as any).mainMessageId) {
      try {
        if (photos.length > 0) {
          // For photos, we need to send a new message since we can't edit media groups
          // But we'll update the main message text to show we're browsing
          await ctx.telegram.editMessageText(
            ctx.chat!.id,
            (ctx.session as any).mainMessageId,
            undefined,
            `🎛 *Browsing Listings*\n\nPage ${page + 1}`,
            { parse_mode: 'Markdown', reply_markup: replyMarkup }
          );
          
          // Send the photos as a separate media group
          const mediaGroup = photos.map((fileId: string, i: number) => ({
            type: 'photo', media: fileId,
            ...(i === 0 ? { caption: msg, parse_mode: 'Markdown' } : {})
          }));
          await ctx.replyWithMediaGroup(mediaGroup);
        } else {
          // No photos, just edit the main message
          await ctx.telegram.editMessageText(
            ctx.chat!.id,
            (ctx.session as any).mainMessageId,
            undefined,
            msg,
            { parse_mode: 'Markdown', reply_markup: replyMarkup }
          );
        }
      } catch (error: any) {
        if (error.description?.includes('message is not modified')) {
          console.log('Message content unchanged, skipping edit');
        } else {
          console.error('Error editing message:', error);
          // Fallback to sending new message
          if (photos.length > 0) {
            const mediaGroup = photos.map((fileId: string, i: number) => ({
              type: 'photo', media: fileId,
              ...(i === 0 ? { caption: msg, parse_mode: 'Markdown' } : {})
            }));
            await ctx.replyWithMediaGroup(mediaGroup);
          } else {
            await ctx.reply(msg, { parse_mode: 'Markdown', reply_markup: replyMarkup });
          }
        }
      }
    } else {
      // No main message to edit, send new one
      if (photos.length > 0) {
        const mediaGroup = photos.map((fileId: string, i: number) => ({
          type: 'photo', media: fileId,
          ...(i === 0 ? { caption: msg, parse_mode: 'Markdown' } : {})
        }));
        await ctx.replyWithMediaGroup(mediaGroup);
      } else {
        await ctx.reply(msg, { parse_mode: 'Markdown', reply_markup: replyMarkup });
      }
    }
  } catch (error) {
    console.error('Error in handleBrowseListings:', error);
    const errorText = `❌ *Error*\n\nSorry, there was an error loading the listings. Please try again.`;
    const errorButtons = Markup.inlineKeyboard([
      [Markup.button.callback('🔙 Back to Menu', 'back_to_menu')],
    ]).reply_markup;
    
    if ((ctx.session as any).mainMessageId) {
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