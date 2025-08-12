import { Telegraf, Scenes } from 'telegraf';
import { PrismaClient } from '../../prisma-client';
import { BotContext } from '../types/context';
import { Markup } from 'telegraf';

export async function handleAddListing(ctx: BotContext) {
  if (ctx.chat?.type !== 'private') return;
  await ctx.scene.enter('add-listing-wizard');
}

export function registerAddListingCommand(bot: Telegraf<BotContext>, prisma: PrismaClient) {
  bot.command('add', handleAddListing);
} 