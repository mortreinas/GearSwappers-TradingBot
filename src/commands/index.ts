import { Telegraf, Scenes } from 'telegraf';
import { PrismaClient } from '../../prisma-client';
import { registerStartCommand } from './start';
import { registerAddListingCommand } from './add';
import { registerMyListingsCommand } from './mylistings';
import { registerBrowseListingsCommand } from './browse';
import { registerGroupListingsCommand } from './listings';
import { BotContext } from '../types/context';

export function setupCommands(bot: Telegraf<BotContext>, prisma: PrismaClient) {
  registerStartCommand(bot, prisma);
  registerAddListingCommand(bot, prisma);
  registerMyListingsCommand(bot, prisma);
  registerBrowseListingsCommand(bot, prisma);
  registerGroupListingsCommand(bot, prisma);
} 