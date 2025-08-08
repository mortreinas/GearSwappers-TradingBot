import { Scenes } from 'telegraf';
import { PrismaClient } from '../../prisma-client';

export interface SessionData {
  addListing?: {
    title?: string;
    description?: string;
    price?: string;
    location?: string;
    contact?: string;
    photos?: string[];
  };
}

export interface BotContext extends Scenes.WizardContext {
  prisma: PrismaClient;
  session: SessionData;
} 