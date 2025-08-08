import { Telegraf, Markup, Scenes } from 'telegraf';
import { PrismaClient } from '../../prisma-client';

export async function handleMyListings(ctx, prisma: PrismaClient) {
  if (ctx.chat?.type !== 'private') return;
  const user = await prisma.user.findUnique({ where: { telegramId: String(ctx.from.id) }, include: { listings: true } });
  if (!user || !user.listings.length) {
    await ctx.reply('You have no listings.');
    if (ctx.callbackQuery) await ctx.answerCbQuery();
    return;
  }
  for (const listing of user.listings) {
    let msg = `*${listing.title}*`;
    if (listing.price) msg += `\n💵 Price: ${listing.price}`;
    await ctx.reply(msg, {
      parse_mode: 'Markdown',
      reply_markup: Markup.inlineKeyboard([
        [Markup.button.callback('✏️ Edit', `edit_listing_${listing.id}`), Markup.button.callback('🗑 Delete', `delete_listing_${listing.id}`)]
      ]).reply_markup
    });
  }
  if (ctx.callbackQuery) await ctx.answerCbQuery();
}

// Edit listing wizard state
const editStates = {};

export function registerMyListingsCommand(bot: Telegraf<Scenes.WizardContext>, prisma: PrismaClient) {
  bot.command('mylistings', async (ctx) => {
    console.log('/mylistings command triggered');
    await handleMyListings(ctx, prisma);
  });
  bot.action(/delete_listing_(\d+)/, async (ctx) => {
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
      await ctx.reply('Listing deleted.');
    }
    await ctx.answerCbQuery();
  });

  // Edit listing flow
  bot.action(/edit_listing_(\d+)/, async (ctx) => {
    if (ctx.chat?.type !== 'private') return;
    const listingId = parseInt(ctx.match[1], 10);
    const listing = await prisma.listing.findUnique({ where: { id: listingId } });
    if (!listing) {
      await ctx.answerCbQuery('Listing not found.');
      return;
    }
    editStates[ctx.from.id] = { step: 0, listingId, data: { ...listing, photos: JSON.parse(listing.photos || '[]') } };
    await ctx.reply('What do you want to edit?', {
      reply_markup: Markup.inlineKeyboard([
        [Markup.button.callback('Title', 'edit_field_title')],
        [Markup.button.callback('Description', 'edit_field_description')],
        [Markup.button.callback('Price', 'edit_field_price')],
        [Markup.button.callback('Location', 'edit_field_location')],
        [Markup.button.callback('Contact', 'edit_field_contact')],
        [Markup.button.callback('Done', 'edit_field_done')]
      ]).reply_markup
    });
    await ctx.answerCbQuery();
  });

  bot.action(/edit_field_(title|description|price|location|contact)/, async (ctx) => {
    const userState = editStates[ctx.from.id];
    if (!userState) return;
    const field = ctx.match[1];
    userState.editingField = field;
    await ctx.reply(`Send new value for ${field}:`);
    await ctx.answerCbQuery();
  });

  bot.action('edit_field_done', async (ctx) => {
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
        contact: data.contact,
        photos: JSON.stringify(data.photos),
      },
    });
    delete editStates[ctx.from.id];
    await ctx.reply('Listing updated!');
    await ctx.answerCbQuery();
  });

  bot.on('text', async (ctx, next) => {
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
        [Markup.button.callback('Done', 'edit_field_done')]
      ]).reply_markup
    });
  });
} 