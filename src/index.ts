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

async function initializeDatabase() {
  try {
    console.log('Initializing database...');
    await prisma.$connect();
    console.log('Database connected successfully');
    
    // Push the schema to create tables
    const { execSync } = require('child_process');
    execSync('pnpm exec prisma db push', { stdio: 'inherit' });
    console.log('Database schema applied successfully');
  } catch (error) {
    console.error('Database initialization failed:', error);
    throw error;
  }
}

async function startBot() {
  try {
    // Initialize database first
    await initializeDatabase();
    
    const bot = new Telegraf<BotContext>(BOT_TOKEN!);

    // Middleware to inject prisma client
    bot.use(async (ctx, next) => {
      (ctx as any).prisma = prisma;
      await next();
    });

    bot.use(session());
    setupScenes(bot, prisma);
    setupCommands(bot, prisma);

    // Add error handling
    bot.catch((err, ctx) => {
      console.error(`Error for ${ctx.updateType}:`, err);
      try {
        if (ctx.chat?.type === 'private') {
          ctx.reply('Sorry, something went wrong. Please try again later.');
        }
      } catch (e) {
        console.error('Error sending error message:', e);
      }
    });

    console.log('Starting GearTrader bot...');
    await bot.launch();
    console.log('Bot started successfully!');
  } catch (error) {
    console.error('Failed to start bot:', error);
    process.exit(1);
  }
}

// Start the application
startBot();

process.once('SIGINT', () => {
  console.log('Shutting down...');
  prisma.$disconnect();
  process.exit(0);
});
process.once('SIGTERM', () => {
  console.log('Shutting down...');
  prisma.$disconnect();
  process.exit(0);
}); 