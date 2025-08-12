import { Scenes, Markup } from 'telegraf';
import { PrismaClient } from '../../prisma-client';
import { z } from 'zod';
import { BotContext } from '../types/context';

const addListingSchema = z.object({
  title: z.string().min(3).max(100),
  description: z.string().min(10).max(1000),
  price: z.string().max(50).optional(),
  location: z.string().min(2).max(100),
  contact: z.string().min(2).max(100),
  photos: z.array(z.string()).max(5),
});

export function addListingWizard(prisma: PrismaClient) {
  return new Scenes.WizardScene(
    'add-listing-wizard',
    async (ctx: any) => {
      (ctx.session as any).addListing = {};
      await ctx.reply('Enter the title of your listing:');
      return ctx.wizard.next();
    },
    async (ctx: any) => {
      if (ctx.message && 'text' in ctx.message) {
        (ctx.session as any).addListing = { ...(ctx.session as any).addListing, title: ctx.message.text };
        await ctx.reply('Enter a description:');
        return ctx.wizard.next();
      }
      await ctx.reply('Please send text for the title.');
    },
    async (ctx: any) => {
      if (ctx.message && 'text' in ctx.message) {
        (ctx.session as any).addListing = { ...(ctx.session as any).addListing, description: ctx.message.text };
        await ctx.reply('Enter a price (or type skip):');
        return ctx.wizard.next();
      }
      await ctx.reply('Please send text for the description.');
    },
    async (ctx: any) => {
      if (ctx.message && 'text' in ctx.message) {
        const price = ctx.message.text.trim().toLowerCase() === 'skip' ? undefined : ctx.message.text;
        (ctx.session as any).addListing = { ...(ctx.session as any).addListing, price };
        await ctx.reply('Enter your location:');
        return ctx.wizard.next();
      }
      await ctx.reply('Please send text for the price or type skip.');
    },
    async (ctx: any) => {
      if (ctx.message && 'text' in ctx.message) {
        (ctx.session as any).addListing = { ...(ctx.session as any).addListing, location: ctx.message.text };
        await ctx.reply('Enter your contact info:');
        return ctx.wizard.next();
      }
      await ctx.reply('Please send text for the location.');
    },
    async (ctx: any) => {
      if (ctx.message && 'text' in ctx.message) {
        (ctx.session as any).addListing = { ...(ctx.session as any).addListing, contact: ctx.message.text, photos: [] };
        await ctx.reply('Send up to 5 photos (send /done when finished):');
        return ctx.wizard.next();
      }
      await ctx.reply('Please send text for the contact info.');
    },
    async (ctx: any) => {
      if (ctx.message && 'photo' in ctx.message) {
        const fileId = ctx.message.photo[ctx.message.photo.length - 1].file_id;
        (ctx.session as any).addListing.photos = (ctx.session as any).addListing.photos || [];
        if ((ctx.session as any).addListing.photos.length < 5) {
          (ctx.session as any).addListing.photos.push(fileId);
          await ctx.reply(`Photo ${(ctx.session as any).addListing.photos.length}/5 received. Send more or /done.`);
        } else {
          await ctx.reply('You have reached the maximum of 5 photos. Send /done to finish.');
        }
        return;
      }
      if (ctx.message && 'text' in ctx.message && ctx.message.text === '/done') {
        // Validate and save
        try {
          const data = addListingSchema.parse((ctx.session as any).addListing);
          const user = await prisma.user.upsert({
            where: { telegramId: String(ctx.from?.id) },
            update: {
              username: ctx.from?.username,
              contact: data.contact,
            },
            create: {
              telegramId: String(ctx.from?.id),
              username: ctx.from?.username,
              contact: data.contact,
            },
          });
          await prisma.listing.create({
            data: {
              userId: user.id,
              title: data.title,
              description: data.description,
              price: data.price,
              location: data.location,
              photos: JSON.stringify(data.photos),
            },
          });
          await ctx.reply('Your listing has been added!');
        } catch (e) {
          await ctx.reply('There was an error saving your listing. Please try again.');
        }
        return ctx.scene.leave();
      }
      await ctx.reply('Send a photo or /done to finish.');
    }
  );
} 