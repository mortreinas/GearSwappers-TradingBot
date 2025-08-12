import { Telegraf, Markup, Scenes } from 'telegraf';
import { PrismaClient } from '../../prisma-client';
import { BotContext } from '../types/context';

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

export function registerGroupListingsCommand(bot: Telegraf<BotContext>, prisma: PrismaClient) {
  // Show all listings as buttons with minimal info
  bot.command('listings', async (ctx) => {
    try {
      console.log('/listings command triggered');
      
      // Clean slate: Delete old bot messages and start fresh
      await cleanBotMessages(ctx);
      
      const listings = await prisma.listing.findMany({
        orderBy: { createdAt: 'desc' },
        include: { user: true },
      });
      console.log(`Found ${listings.length} listings`);
      
      if (!listings.length) {
        // Always send a fresh message with interactive menu
        const noListingsText = `📭 *No Listings Found*\n\nBe the first to add one with /add! 🎸`;
        const noListingsButtons = Markup.inlineKeyboard([
          [Markup.button.callback('➕ Add New Listing', 'add_listing')],
          [Markup.button.callback('🔙 Back to Menu', 'back_to_menu')],
        ]).reply_markup;
        
        // Send new message with the interactive menu
        const sent = await ctx.reply(noListingsText, { 
          parse_mode: 'Markdown', 
          reply_markup: noListingsButtons 
        });
        
        // Store this as the main interactive message
        if (!ctx.session) (ctx as any).session = {};
        (ctx.session as any).mainMessageId = sent.message_id;
        return;
      }
      
      // Show all as buttons: just the title
      const buttons = listings.map(listing => {
        return [Markup.button.callback(listing.title, `show_listing_${listing.id}`)];
      });
      
      // Add back to menu button
      buttons.push([Markup.button.callback('🔙 Back to Menu', 'back_to_menu')]);
      
      // Always send a fresh interactive menu as the LAST message
      const listingsText = `📋 *Available Listings*\n\nFound ${listings.length} listings. Select one to view details:`;
      const listingsButtons = Markup.inlineKeyboard(buttons).reply_markup;
      
      // Send new message with the interactive menu
      const sent = await ctx.reply(listingsText, { 
        parse_mode: 'Markdown', 
        reply_markup: listingsButtons 
      });
      
      // Store this as the main interactive message
      if (!ctx.session) (ctx as any).session = {};
      (ctx.session as any).mainMessageId = sent.message_id;
    } catch (error) {
      console.error('Error in listings command:', error);
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
      
      const actionButtons = [];
      if (navigationButtons.length > 0) actionButtons.push(navigationButtons);
      actionButtons.push([Markup.button.callback('🔙 Back to Menu', 'back_to_menu')]);
      
      const listingButtons = Markup.inlineKeyboard(actionButtons).reply_markup;
      
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
      
      // Now send a separate navigation message that CAN be edited
      const navigationMessage = await ctx.reply('Navigation:', { reply_markup: listingButtons });
      
      // Store this navigation message ID for future editing
      if (!ctx.session) (ctx as any).session = {};
      (ctx.session as any).navigationMessageId = navigationMessage.message_id;
    } catch (error) {
      console.error('Error showing listing:', error);
      await ctx.reply('❌ Error loading listing. Please try again.');
    }
  });
}
