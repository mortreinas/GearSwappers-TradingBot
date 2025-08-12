import { Telegraf, Markup, Scenes } from 'telegraf';
import { PrismaClient } from '../../prisma-client';
import { BotContext } from '../types/context';

export async function handleMyListings(ctx: BotContext, prisma: PrismaClient) {
  try {
    if (ctx.chat?.type !== 'private') return;
    const user = await prisma.user.findUnique({ where: { telegramId: String(ctx.from?.id) }, include: { listings: true } });
    if (!user || !user.listings.length) {
      const noListingsText = `📦 *My Listings*\n\nYou have no listings.`;
      const noListingsButtons = Markup.inlineKeyboard([
        [Markup.button.callback('➕ Add Your First Listing', 'add_listing')],
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
      if (ctx.callbackQuery) await ctx.answerCbQuery();
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
    
    if ((ctx.session as any).mainMessageId) {
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
    
    if (ctx.callbackQuery) await ctx.answerCbQuery();
  } catch (error) {
    console.error('Error in handleMyListings:', error);
    const errorText = `❌ *Error*\n\nSorry, there was an error loading your listings. Please try again.`;
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

// Edit listing wizard state
interface EditState {
  step: number;
  listingId: number;
  data: any;
  editingField?: string;
}

const editStates: Record<number, EditState> = {};

export function registerMyListingsCommand(bot: Telegraf<BotContext>, prisma: PrismaClient) {
  bot.command('mylistings', async (ctx) => {
    try {
      console.log('/mylistings command triggered');
      await handleMyListings(ctx, prisma);
    } catch (error) {
      console.error('Error in mylistings command:', error);
      await ctx.reply('Sorry, there was an error. Please try again.', {
        reply_markup: Markup.inlineKeyboard([
          [Markup.button.callback('🔙 Back to Menu', 'back_to_menu')],
        ]).reply_markup
      });
    }
  });
  bot.action(/delete_listing_(\d+)/, async (ctx) => {
    try {
      if (ctx.chat?.type !== 'private') return;
      const listingId = parseInt(ctx.match[1], 10);
      const listing = await prisma.listing.findUnique({ where: { id: listingId } });
      if (!listing) {
        await ctx.answerCbQuery('Listing not found.');
        return;
      }
      if (listing.userId) {
        await prisma.listing.delete({ where: { id: listingId } });
        // Check if user has more listings
        const user = await prisma.user.findUnique({ where: { id: listing.userId }, include: { listings: true } });
        if (user && user.listings.length === 0) {
          await prisma.user.delete({ where: { id: user.id } });
        }
        await ctx.reply('Listing deleted successfully!', {
          reply_markup: Markup.inlineKeyboard([
            [Markup.button.callback('🔙 Back to Menu', 'back_to_menu')],
          ]).reply_markup
        });
      }
      await ctx.answerCbQuery();
    } catch (error) {
      console.error('Error deleting listing:', error);
      await ctx.answerCbQuery('Error deleting listing');
    }
  });

  // Edit listing flow
  bot.action(/edit_listing_(\d+)/, async (ctx) => {
    try {
      if (ctx.chat?.type !== 'private') return;
      const listingId = parseInt(ctx.match[1], 10);
      const listing = await prisma.listing.findUnique({ where: { id: listingId } });
      if (!listing) {
        await ctx.answerCbQuery('Listing not found.');
        return;
      }
      if (ctx.from?.id) {
        editStates[ctx.from.id] = { step: 0, listingId, data: { ...listing, photos: JSON.parse(listing.photos || '[]') } };
      }
      await ctx.reply('What do you want to edit?', {
        reply_markup: Markup.inlineKeyboard([
          [Markup.button.callback('Title', 'edit_field_title')],
          [Markup.button.callback('Description', 'edit_field_description')],
          [Markup.button.callback('Price', 'edit_field_price')],
          [Markup.button.callback('Location', 'edit_field_location')],
          [Markup.button.callback('Contact', 'edit_field_contact')],
          [Markup.button.callback('Done', 'edit_field_done')],
          [Markup.button.callback('🔙 Back to Menu', 'back_to_menu')]
        ]).reply_markup
      });
      await ctx.answerCbQuery();
    } catch (error) {
      console.error('Error editing listing:', error);
      await ctx.answerCbQuery('Error editing listing');
    }
  });

  bot.action(/edit_field_(title|description|price|location|contact)/, async (ctx) => {
    try {
      if (ctx.from?.id) {
        const userState = editStates[ctx.from.id];
        if (!userState) return;
        const field = ctx.match[1];
        userState.editingField = field;
        await ctx.reply(`Send new value for ${field}:`);
      }
      await ctx.answerCbQuery();
    } catch (error) {
      console.error('Error in edit field action:', error);
      await ctx.answerCbQuery('Error editing field');
    }
  });

  bot.action('edit_field_done', async (ctx) => {
    try {
      if (ctx.from?.id) {
        const userState = editStates[ctx.from.id];
        if (!userState) return;
        // Save changes
        const { listingId, data } = userState;
        await prisma.listing.update({
          where: { id: listingId },
          data: {
            title: data.title,
            description: data.description,
            price: data.price,
            location: data.location,
            photos: JSON.stringify(data.photos),
          },
        });
        delete editStates[ctx.from.id];
        await ctx.reply('Listing updated successfully!', {
          reply_markup: Markup.inlineKeyboard([
            [Markup.button.callback('🔙 Back to Menu', 'back_to_menu')],
          ]).reply_markup
        });
      }
      await ctx.answerCbQuery();
    } catch (error) {
      console.error('Error updating listing:', error);
      await ctx.answerCbQuery('Error updating listing');
    }
  });

  bot.on('text', async (ctx, next) => {
    try {
      if (ctx.from?.id) {
        const userState = editStates[ctx.from.id];
        if (!userState || !userState.editingField) return next();
        const field = userState.editingField;
        userState.data[field] = ctx.message.text;
        userState.editingField = undefined;
        await ctx.reply(`${field.charAt(0).toUpperCase() + field.slice(1)} updated.`);
        await ctx.reply('What do you want to edit next?', {
          reply_markup: Markup.inlineKeyboard([
            [Markup.button.callback('Title', 'edit_field_title')],
            [Markup.button.callback('Description', 'edit_field_description')],
            [Markup.button.callback('Price', 'edit_field_price')],
            [Markup.button.callback('Location', 'edit_field_location')],
            [Markup.button.callback('Contact', 'edit_field_contact')],
            [Markup.button.callback('Done', 'edit_field_done')],
            [Markup.button.callback('🔙 Back to Menu', 'back_to_menu')]
          ]).reply_markup
        });
      }
    } catch (error) {
      console.error('Error in text handler:', error);
    }
  });
} 