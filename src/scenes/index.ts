import { Telegraf, Scenes } from 'telegraf';
import { PrismaClient } from '../../prisma-client';
import { addListingWizard } from './addListingWizard';
import { BotContext } from '../types/context';

export * from './addListingWizard';

export function setupScenes(bot: Telegraf<BotContext>, prisma: PrismaClient) {
  const stage = new Scenes.Stage([addListingWizard(prisma)] as any);
  
  // Add skip price button handler
  bot.action('skip_price', async (ctx) => {
    console.log('Skip price button pressed');
    await ctx.answerCbQuery();
    (ctx.session as any).addListing = { ...(ctx.session as any).addListing, price: undefined };
    await ctx.reply('Price skipped. Enter your location (minimum 2 characters):');
    await ctx.wizard.next();
  });
  
  // Add cancel listing button handler
  bot.action('cancel_listing', async (ctx) => {
    console.log('Cancel listing button pressed');
    await ctx.answerCbQuery();
    await ctx.reply('❌ Listing creation cancelled.');
    await ctx.scene.leave();
    // Import and call the showMainMenu function
    const { showMainMenu } = require('../commands/start');
    await showMainMenu(ctx);
  });
  
  (bot as any).use(stage.middleware());
} 