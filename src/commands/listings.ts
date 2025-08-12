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
        if (ctx.session && (ctx.session as any).mainMessageId) {
          const noListingsText = `📭 *No Listings Found*\n\nBe the first to add one with /add! 🎸`;
          const noListingsButtons = Markup.inlineKeyboard([
            [Markup.button.callback('➕ Add New Listing', 'add_listing')],
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
      
      // Update the main message to show listings
      const listingsText = `📋 *Available Listings*\n\nFound ${listings.length} listings. Select one to view details:`;
      const listingsButtons = Markup.inlineKeyboard(buttons).reply_markup;
      
      if (ctx.session && (ctx.session as any).mainMessageId) {
        try {
          await ctx.telegram.editMessageText(
            ctx.chat!.id,
            (ctx.session as any).mainMessageId,
            undefined,
            listingsText,
            { parse_mode: 'Markdown', reply_markup: listingsButtons }
          );
        } catch (error: any) {
          if (error.description?.includes('message is not modified')) {
            // Message content is the same, no need to edit
            console.log('Message content unchanged, skipping edit');
          } else {
            console.error('Error editing message:', error);
            // Fallback to sending new message
            const sent = await ctx.reply(listingsText, { 
              parse_mode: 'Markdown', 
              reply_markup: listingsButtons 
            });
            (ctx.session as any).mainMessageId = sent.message_id;
          }
        }
      } else {
        const sent = await ctx.reply(listingsText, { 
          parse_mode: 'Markdown', 
          reply_markup: listingsButtons 
        });
        (ctx.session as any).mainMessageId = sent.message_id;
      }
    } catch (error) {
      console.error('Error in listings command:', error);
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

  // Show full description and photos when a button is clicked
  bot.action(/show_listing_(\d+)/, async (ctx) => {
    await ctx.answerCbQuery();
    
    try {
      const listingId = parseInt(ctx.match[1]);
      const listing = await prisma.listing.findUnique({
        where: { id: listingId },
        include: { user: true }
      });
      
      if (!listing) {
        await ctx.reply('❌ Listing not found.');
        return;
      }
      
      const photos = JSON.parse(listing.photos || '[]');
      let msg = `*${listing.title}*\n${listing.description}`;
      if (listing.price) msg += `\n💵 Price: ${listing.price}`;
      msg += `\n📍 Location: ${listing.location}`;
      if (listing.marketplaceLink) msg += `\n🔗 [Marketplace Link](${listing.marketplaceLink})`;
      msg += `\n📞 Contact: ${listing.user.contact}`;
      
      // Get navigation info
      const allListings = await prisma.listing.findMany({ orderBy: { createdAt: 'desc' }, select: { id: true } });
      const currentIndex = allListings.findIndex(l => l.id === listingId);
      const hasNext = currentIndex > 0;
      const hasPrev = currentIndex < allListings.length - 1;
      
      const navigationButtons = [];
      if (hasPrev) { navigationButtons.push(Markup.button.callback('⬅️ Previous', `show_listing_${allListings[currentIndex + 1].id}`)); }
      if (hasNext) { navigationButtons.push(Markup.button.callback('Next ➡️', `show_listing_${allListings[currentIndex - 1].id}`)); }
      
      const actionButtons = [[Markup.button.callback('🔙 Back to Menu', 'back_to_menu')]];
      if (navigationButtons.length > 0) { actionButtons.unshift(navigationButtons); }
      const listingButtons = Markup.inlineKeyboard(actionButtons).reply_markup;
      
      // Edit the main message to show the listing
      if (ctx.session && (ctx.session as any).mainMessageId) {
        try {
          if (photos.length > 0) {
            // For photos, we need to send a new message since we can't edit media groups
            // But we'll update the main message text to show we're viewing a listing
            await ctx.telegram.editMessageText(
              ctx.chat!.id,
              (ctx.session as any).mainMessageId,
              undefined,
              `📋 *Viewing Listing*\n\n${listing.title}`,
              { parse_mode: 'Markdown', reply_markup: listingButtons }
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
              { parse_mode: 'Markdown', reply_markup: listingButtons }
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
                ...(i === 0 ? { caption: msg, parse_mode: 'Markdown', reply_markup: listingButtons } : {})
              }));
              await ctx.replyWithMediaGroup(mediaGroup);
            } else {
              await ctx.reply(msg, { parse_mode: 'Markdown', reply_markup: listingButtons });
            }
          }
        }
      } else {
        // No main message to edit, send new one
        if (photos.length > 0) {
          const mediaGroup = photos.map((fileId: string, i: number) => ({
            type: 'photo', media: fileId,
            ...(i === 0 ? { caption: msg, parse_mode: 'Markdown', reply_markup: listingButtons } : {})
          }));
          await ctx.replyWithMediaGroup(mediaGroup);
        } else {
          await ctx.reply(msg, { parse_mode: 'Markdown', reply_markup: listingButtons });
        }
      }
    } catch (error) {
      console.error('Error showing listing:', error);
      await ctx.reply('❌ Error loading listing. Please try again.');
    }
  });
}
