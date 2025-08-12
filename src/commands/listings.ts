import { Telegraf, Markup, Scenes } from 'telegraf';
import { PrismaClient } from '../../prisma-client';
import { BotContext } from '../types/context';

export function registerGroupListingsCommand(bot: Telegraf<BotContext>, prisma: PrismaClient) {
  // Show all listings as buttons with minimal info
  bot.command('listings', async (ctx) => {
    try {
      console.log('/listings command triggered');
      const listings = await prisma.listing.findMany({
        orderBy: { createdAt: 'desc' },
        include: { user: true },
      });
      console.log(`Found ${listings.length} listings`);
      
      if (!listings.length) {
        // Update the main message if it exists, otherwise send new one
        if ((ctx.session as any).mainMessageId) {
          const noListingsText = `📭 *No Listings Found*\n\nBe the first to add one with /add! 🎸`;
          const noListingsButtons = Markup.inlineKeyboard([
            [Markup.button.callback('🔙 Back to Menu', 'back_to_menu')],
          ]).reply_markup;
          
          await ctx.telegram.editMessageText(
            ctx.chat!.id,
            (ctx.session as any).mainMessageId,
            undefined,
            noListingsText,
            { parse_mode: 'Markdown', reply_markup: noListingsButtons }
          );
        } else {
          await ctx.reply('No listings found. Be the first to add one with /add! 🎸', {
            reply_markup: Markup.inlineKeyboard([
              [Markup.button.callback('🔙 Back to Menu', 'back_to_menu')],
            ]).reply_markup
          });
        }
        return;
      }
      
      // Show all as buttons: just the title
      const buttons = listings.map(listing => {
        return [Markup.button.callback(listing.title, `show_listing_${listing.id}`)];
      });
      
      // Add back to menu button
      buttons.push([Markup.button.callback('🔙 Back to Menu', 'back_to_menu')]);
      
      const listingsText = `📋 *Available Listings*\n\nFound ${listings.length} listings. Select one to view details:`;
      const listingsButtons = Markup.inlineKeyboard(buttons).reply_markup;
      
      // Update the main message if it exists, otherwise send new one
      if ((ctx.session as any).mainMessageId) {
        await ctx.telegram.editMessageText(
          ctx.chat!.id,
          (ctx.session as any).mainMessageId,
          undefined,
          listingsText,
          { parse_mode: 'Markdown', reply_markup: listingsButtons }
        );
      } else {
        const sent = await ctx.reply(listingsText, { reply_markup: listingsButtons });
        (ctx.session as any).mainMessageId = sent.message_id;
      }
    } catch (error) {
      console.error('Error in listings command:', error);
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
  });

  // Show full description and photos when a button is clicked
  bot.action(/show_listing_(\d+)/, async (ctx) => {
    try {
      const listingId = parseInt(ctx.match[1], 10);
      console.log(`Showing listing ${listingId}`);
      
      const listing = await prisma.listing.findUnique({ where: { id: listingId }, include: { user: true } });
      if (!listing) {
        await ctx.answerCbQuery('Listing not found.');
        return;
      }
      const photos = JSON.parse(listing.photos || '[]');
      let msg = `*${listing.title}*\n${listing.description}`;
      if (listing.price) msg += `\n💵 Price: ${listing.price}`;
      msg += `\n📍 Location: ${listing.location}`;
      msg += `\n📞 Contact: ${listing.user.contact}`;
      
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
      await ctx.answerCbQuery();
      
      // Add back to menu button after showing listing
      await ctx.reply('What would you like to do next?', {
        reply_markup: Markup.inlineKeyboard([
          [Markup.button.callback('🔙 Back to Menu', 'back_to_menu')],
        ]).reply_markup
      });
    } catch (error) {
      console.error('Error showing listing:', error);
      await ctx.answerCbQuery('Error loading listing details');
    }
  });
}
