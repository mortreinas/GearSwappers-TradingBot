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
    
    // Clean up wizard messages if they exist
    if ((ctx.session as any).wizardMessageIds && (ctx.session as any).wizardMessageIds.length > 0) {
      try {
        console.log(`Cleaning up ${(ctx.session as any).wizardMessageIds.length} wizard messages on cancel`);
        
        // Delete all wizard messages
        for (const messageId of (ctx.session as any).wizardMessageIds) {
          try {
            await ctx.telegram.deleteMessage(ctx.chat!.id, messageId);
          } catch (error) {
            console.log(`Failed to delete message ${messageId}:`, error);
          }
        }
        
        // Clear the wizard message IDs
        (ctx.session as any).wizardMessageIds = [];
      } catch (error) {
        console.error('Error cleaning up wizard messages on cancel:', error);
      }
    }
    
    await ctx.reply('❌ Listing creation cancelled.');
    await ctx.scene.leave();
    
    // Import and call the showMainMenu function
    const { showMainMenu } = require('../commands/start');
    await showMainMenu(ctx);
  });
  
  (bot as any).use(stage.middleware());
} 