import { Context, Scenes } from 'telegraf';

export interface SessionData {
  cursor: number;
  addListing?: {
    title?: string;
    description?: string;
    price?: string;
    location?: string;
    contact?: string;
    photos?: string[];
    marketplaceLink?: string;
  };
  mainMessageId?: number;
  wizardMessageIds?: number[];
  navigationMessageId?: number; // Added: tracks the navigation message ID
}

export interface BotContext extends Scenes.WizardContext<SessionData> {
  prisma: any; // Will be injected via middleware
} 