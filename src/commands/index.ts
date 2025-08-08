import { Telegraf, Scenes } from 'telegraf';
import { PrismaClient } from '../../prisma-client';
import { registerStartCommand } from './start';
import { registerAddListingCommand } from './add';
import { registerMyListingsCommand } from './mylistings';
import { registerBrowseListingsCommand } from './browse';
import { registerGroupListingsCommand } from './listings';

export function setupCommands(bot: Telegraf<Scenes.WizardContext>, prisma: PrismaClient) {
  registerStartCommand(bot, prisma);
  registerAddListingCommand(bot, prisma);
  registerMyListingsCommand(bot, prisma);
  registerBrowseListingsCommand(bot, prisma);
  registerGroupListingsCommand(bot, prisma);
} 