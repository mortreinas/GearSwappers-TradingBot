import { Telegraf, Scenes } from 'telegraf';
import { PrismaClient } from '../../prisma-client';

export async function handleAddListing(ctx: Scenes.WizardContext) {
  if (ctx.chat?.type !== 'private') return;
  await ctx.scene.enter('add-listing-wizard');
}

export function registerAddListingCommand(bot: Telegraf<Scenes.WizardContext>, prisma: PrismaClient) {
  bot.command('add', handleAddListing);
} 