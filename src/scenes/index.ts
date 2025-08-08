import { Telegraf, Scenes } from 'telegraf';
import { PrismaClient } from '../../prisma-client';
import { addListingWizard } from './addListingWizard';

export * from './addListingWizard';

export function setupScenes(bot: Telegraf<Scenes.WizardContext>, prisma: PrismaClient) {
  const stage = new Scenes.Stage([addListingWizard(prisma)]);
  bot.use(stage.middleware());
} 