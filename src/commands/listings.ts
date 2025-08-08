import { Telegraf, Markup, Scenes } from 'telegraf';
import { PrismaClient } from '../../prisma-client';

export function registerGroupListingsCommand(bot: Telegraf<Scenes.WizardContext>, prisma: PrismaClient) {
  // Show all listings as buttons with minimal info
  bot.command('listings', async (ctx) => {
    const listings = await prisma.listing.findMany({
      orderBy: { createdAt: 'desc' },
      include: { user: true },
    });
    if (!listings.length) {
      await ctx.reply('No listings found.');
      return;
    }
    // Show all as buttons: "Product Name (Price) - Location"
    const buttons = listings.map(listing => {
      let label = `${listing.title}`;
      if (listing.price) label += ` (${listing.price})`;
      label += ` - ${listing.location}`;
      return [Markup.button.callback(label, `show_listing_${listing.id}`)];
    });
    await ctx.reply('Select a listing to view details:', {
      reply_markup: Markup.inlineKeyboard(buttons).reply_markup
    });
  });

  // Show full description and photos when a button is clicked
  bot.action(/show_listing_(\d+)/, async (ctx) => {
    const listingId = parseInt(ctx.match[1], 10);
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
    if (photos.length) {
      await ctx.replyWithMediaGroup(
        photos.map((fileId, i) => ({
          type: 'photo',
          media: fileId,
          ...(i === 0 ? { caption: msg, parse_mode: 'Markdown' } : {})
        }))
      );
    } else {
      await ctx.reply(msg, { parse_mode: 'Markdown' });
    }
    await ctx.answerCbQuery();
  });
} 