import { config } from 'dotenv';
config();
import { Telegraf, session, Scenes } from 'telegraf';
import { BOT_TOKEN } from './utils/env';
import { setupCommands } from './commands';
import { setupScenes } from './scenes';
import { PrismaClient } from '../prisma-client';

const prisma = new PrismaClient();
prisma.$use(async (params, next) => {
  console.log(`[Prisma] ${params.model}.${params.action}`);
  return next(params);
});
const bot = new Telegraf<Scenes.WizardContext>(BOT_TOKEN);

bot.use(session());
setupScenes(bot, prisma);
setupCommands(bot, prisma);

bot.launch();

process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM')); 