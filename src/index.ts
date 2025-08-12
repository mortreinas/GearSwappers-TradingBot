import { config } from 'dotenv';
config();
import { Telegraf, session, Scenes } from 'telegraf';
import { BOT_TOKEN } from './utils/env';
import { setupCommands } from './commands';
import { setupScenes } from './scenes';
import { PrismaClient } from '../prisma-client';
import { BotContext } from './types/context';

const prisma = new PrismaClient();
prisma.$use(async (params, next) => {
  console.log(`[Prisma] ${params.model}.${params.action}`);
  return next(params);
});

if (!BOT_TOKEN) {
  throw new Error('BOT_TOKEN is required');
}

const bot = new Telegraf<BotContext>(BOT_TOKEN);

// Middleware to inject prisma client
bot.use(async (ctx, next) => {
  (ctx as any).prisma = prisma;
  await next();
});

bot.use(session());
setupScenes(bot, prisma);
setupCommands(bot, prisma);

bot.launch();

process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM')); 