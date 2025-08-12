import { Telegraf, Scenes } from 'telegraf';
import { PrismaClient } from '../../prisma-client';
import { addListingWizard } from './addListingWizard';
import { BotContext } from '../types/context';

export * from './addListingWizard';

export function setupScenes(bot: Telegraf<BotContext>, prisma: PrismaClient) {
  const stage = new Scenes.Stage([addListingWizard(prisma)] as any);
  (bot as any).use(stage.middleware());
} 