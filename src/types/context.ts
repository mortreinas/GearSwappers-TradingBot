import { Context } from 'telegraf';

export interface SessionData {
  cursor: number;
  addListing?: {
    title?: string;
    description?: string;
    price?: string;
    location?: string;
    contact?: string;
    photos?: string[];
  };
}

export interface BotContext extends Context {
  session: SessionData;
  scene: any;
  wizard: any;
  prisma: any; // Will be injected via middleware
} 