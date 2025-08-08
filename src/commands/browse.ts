import { Telegraf, Markup, Scenes } from 'telegraf';
import { PrismaClient } from '../../prisma-client';

const PAGE_SIZE = 3;

export async function handleBrowseListings(ctx, prisma: PrismaClient, page = 0) {
  console.log('sendListings called, page:', page);
  const listings = await prisma.listing.findMany({
    orderBy: { createdAt: 'desc' },
    skip: page * PAGE_SIZE,
    take: PAGE_SIZE,
    include: { user: true },
  });
  if (!listings.length) {
    await ctx.reply('No listings found.');
    return;
  }
  for (const listing of listings) {
    const photos = JSON.parse(listing.photos || '[]');
    let msg = `*${listing.title}*\n${listing.description}\n`;
    if (listing.price) msg += `\n💵 Price: ${listing.price}`;
    msg += `\n📍 Location: ${listing.location}`;
    msg += `\n📞 Contact: ${listing.user.contact}`;
    if (photos.length) {
      await ctx.replyWithPhoto(photos[0], {
        caption: msg,
        parse_mode: 'Markdown',
      });
    } else {
      await ctx.reply(msg, { parse_mode: 'Markdown' });
    }
  }
  await ctx.reply('Navigate:', Markup.inlineKeyboard([
    [Markup.button.callback('⬅️ Prev', `browse_prev_${page}`), Markup.button.callback('➡️ Next', `browse_next_${page}`)]
  ]));
}

export function registerBrowseListingsCommand(bot: Telegraf<Scenes.WizardContext>, prisma: PrismaClient) {
  bot.command('browse', async (ctx) => {
    console.log('/browse command triggered');
    if (ctx.chat?.type !== 'private') return;
    await handleBrowseListings(ctx, prisma, 0);
  });
  bot.action(/browse_next_(\d+)/, async (ctx) => {
    const page = parseInt(ctx.match[1], 10) + 1;
    await handleBrowseListings(ctx, prisma, page);
    await ctx.answerCbQuery();
  });
  bot.action(/browse_prev_(\d+)/, async (ctx) => {
    const page = Math.max(0, parseInt(ctx.match[1], 10) - 1);
    await handleBrowseListings(ctx, prisma, page);
    await ctx.answerCbQuery();
  });
} 