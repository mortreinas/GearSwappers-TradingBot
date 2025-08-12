import { Scenes, Markup } from 'telegraf';
import { PrismaClient } from '../../prisma-client';
import { z } from 'zod';
import { BotContext } from '../types/context';

const addListingSchema = z.object({
  title: z.string().min(3, "Title must be at least 3 characters long").max(100, "Title must be 100 characters or less"),
  description: z.string().min(10, "Description must be at least 10 characters long").max(1000, "Description must be 1000 characters or less"),
  price: z.string().max(50, "Price must be 50 characters or less").optional(),
  location: z.string().min(2, "Location must be at least 2 characters long").max(100, "Location must be 100 characters or less"),
  contact: z.string().min(2, "Contact must be at least 2 characters long").max(100, "Contact must be 100 characters or less"),
  photos: z.array(z.string()).max(5, "Maximum 5 photos allowed"),
});

export function addListingWizard(prisma: PrismaClient) {
  return new Scenes.WizardScene(
    'add-listing-wizard',
    async (ctx: any) => {
      (ctx.session as any).addListing = {};
      await ctx.reply('Enter the title of your listing (minimum 3 characters):', {
        reply_markup: Markup.inlineKeyboard([
          [Markup.button.callback('❌ Cancel', 'cancel_listing')]
        ]).reply_markup
      });
      return ctx.wizard.next();
    },
    async (ctx: any) => {
      if (ctx.message && 'text' in ctx.message) {
        try {
          // Validate title length immediately
          if (ctx.message.text.length < 3) {
            await ctx.reply('❌ Title is too short! It must be at least 3 characters long. Please try again:', {
              reply_markup: Markup.inlineKeyboard([
                [Markup.button.callback('❌ Cancel', 'cancel_listing')]
              ]).reply_markup
            });
            return;
          }
          (ctx.session as any).addListing = { ...(ctx.session as any).addListing, title: ctx.message.text };
          await ctx.reply('Enter a description (minimum 10 characters):', {
            reply_markup: Markup.inlineKeyboard([
              [Markup.button.callback('❌ Cancel', 'cancel_listing')]
            ]).reply_markup
          });
          return ctx.wizard.next();
        } catch (error) {
          await ctx.reply('❌ Invalid title. Please try again:', {
            reply_markup: Markup.inlineKeyboard([
              [Markup.button.callback('❌ Cancel', 'cancel_listing')]
            ]).reply_markup
          });
        }
      }
      await ctx.reply('Please send text for the title (minimum 3 characters).', {
        reply_markup: Markup.inlineKeyboard([
          [Markup.button.callback('❌ Cancel', 'cancel_listing')]
        ]).reply_markup
      });
    },
    async (ctx: any) => {
      if (ctx.message && 'text' in ctx.message) {
        try {
          // Validate description length immediately
          if (ctx.message.text.length < 10) {
            await ctx.reply('❌ Description is too short! It must be at least 10 characters long. Please try again:', {
              reply_markup: Markup.inlineKeyboard([
                [Markup.button.callback('❌ Cancel', 'cancel_listing')]
              ]).reply_markup
            });
            return;
          }
          (ctx.session as any).addListing = { ...(ctx.session as any).addListing, description: ctx.message.text };
          await ctx.reply('Enter a price or use the skip button below:', {
            reply_markup: Markup.inlineKeyboard([
              [Markup.button.callback('⏭️ Skip Price', 'skip_price')],
              [Markup.button.callback('❌ Cancel', 'cancel_listing')]
            ]).reply_markup
          });
          return ctx.wizard.next();
        } catch (error) {
          await ctx.reply('❌ Invalid description. Please try again:', {
            reply_markup: Markup.inlineKeyboard([
              [Markup.button.callback('❌ Cancel', 'cancel_listing')]
            ]).reply_markup
          });
        }
      }
      await ctx.reply('Please send text for the description (minimum 10 characters).', {
        reply_markup: Markup.inlineKeyboard([
          [Markup.button.callback('❌ Cancel', 'cancel_listing')]
        ]).reply_markup
      });
    },
    async (ctx: any) => {
      if (ctx.message && 'text' in ctx.message) {
        const price = ctx.message.text.trim();
        (ctx.session as any).addListing = { ...(ctx.session as any).addListing, price };
        await ctx.reply('Enter your location (minimum 2 characters):', {
          reply_markup: Markup.inlineKeyboard([
            [Markup.button.callback('❌ Cancel', 'cancel_listing')]
          ]).reply_markup
        });
        return ctx.wizard.next();
      }
      await ctx.reply('Please send text for the price or use the skip button.', {
        reply_markup: Markup.inlineKeyboard([
          [Markup.button.callback('❌ Cancel', 'cancel_listing')]
        ]).reply_markup
      });
    },
    async (ctx: any) => {
      if (ctx.message && 'text' in ctx.message) {
        try {
          // Validate location length immediately
          if (ctx.message.text.length < 2) {
            await ctx.reply('❌ Location is too short! It must be at least 2 characters long. Please try again:', {
              reply_markup: Markup.inlineKeyboard([
                [Markup.button.callback('❌ Cancel', 'cancel_listing')]
              ]).reply_markup
            });
            return;
          }
          (ctx.session as any).addListing = { ...(ctx.session as any).addListing, location: ctx.message.text };
          await ctx.reply('Enter your contact info (minimum 2 characters):', {
            reply_markup: Markup.inlineKeyboard([
              [Markup.button.callback('❌ Cancel', 'cancel_listing')]
            ]).reply_markup
          });
          return ctx.wizard.next();
        } catch (error) {
          await ctx.reply('❌ Invalid location. Please try again:', {
            reply_markup: Markup.inlineKeyboard([
              [Markup.button.callback('❌ Cancel', 'cancel_listing')]
            ]).reply_markup
          });
        }
      }
      await ctx.reply('Please send text for the location (minimum 2 characters).', {
        reply_markup: Markup.inlineKeyboard([
          [Markup.button.callback('❌ Cancel', 'cancel_listing')]
        ]).reply_markup
      });
    },
    async (ctx: any) => {
      if (ctx.message && 'text' in ctx.message) {
        try {
          // Validate contact length immediately
          if (ctx.message.text.length < 2) {
            await ctx.reply('❌ Contact info is too short! It must be at least 2 characters long. Please try again:', {
              reply_markup: Markup.inlineKeyboard([
                [Markup.button.callback('❌ Cancel', 'cancel_listing')]
              ]).reply_markup
            });
            return;
          }
          (ctx.session as any).addListing = { ...(ctx.session as any).addListing, contact: ctx.message.text, photos: [] };
          await ctx.reply('Send up to 5 photos (send /done when finished):', {
            reply_markup: Markup.inlineKeyboard([
              [Markup.button.callback('❌ Cancel', 'cancel_listing')]
            ]).reply_markup
          });
          return ctx.wizard.next();
        } catch (error) {
          await ctx.reply('❌ Invalid contact info. Please try again:', {
            reply_markup: Markup.inlineKeyboard([
              [Markup.button.callback('❌ Cancel', 'cancel_listing')]
            ]).reply_markup
          });
        }
      }
      await ctx.reply('Please send text for the contact info (minimum 2 characters).', {
        reply_markup: Markup.inlineKeyboard([
          [Markup.button.callback('❌ Cancel', 'cancel_listing')]
        ]).reply_markup
      });
    },
    async (ctx: any) => {
      if (ctx.message && 'photo' in ctx.message) {
        const fileId = ctx.message.photo[ctx.message.photo.length - 1].file_id;
        (ctx.session as any).addListing.photos = (ctx.session as any).addListing.photos || [];
        if ((ctx.session as any).addListing.photos.length < 5) {
          (ctx.session as any).addListing.photos.push(fileId);
          await ctx.reply(`📸 Photo ${(ctx.session as any).addListing.photos.length}/5 received. Send more or /done.`, {
            reply_markup: Markup.inlineKeyboard([
              [Markup.button.callback('❌ Cancel', 'cancel_listing')]
            ]).reply_markup
          });
        } else {
          await ctx.reply('📸 You have reached the maximum of 5 photos. Send /done to finish.', {
            reply_markup: Markup.inlineKeyboard([
              [Markup.button.callback('❌ Cancel', 'cancel_listing')]
            ]).reply_markup
          });
        }
        return;
      }
      if (ctx.message && 'text' in ctx.message && ctx.message.text === '/done') {
        // Validate and save
        try {
          const data = addListingSchema.parse((ctx.session as any).addListing);
          console.log('Saving listing data:', data);
          
          // Use ctx.prisma instead of parameter
          const user = await (ctx as any).prisma.user.upsert({
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
          console.log('User created/updated:', user);
          
          const listing = await (ctx as any).prisma.listing.create({
            data: {
              userId: user.id,
              title: data.title,
              description: data.description,
              price: data.price,
              location: data.location,
              photos: JSON.stringify(data.photos),
            },
          });
          console.log('Listing created:', listing);
          
          await ctx.reply('🎉 Your listing has been added successfully!', {
            reply_markup: Markup.inlineKeyboard([
              [Markup.button.callback('🔙 Back to Menu', 'back_to_menu')],
            ]).reply_markup
          });
        } catch (e) {
          console.error('Error saving listing:', e);
          if (e instanceof z.ZodError) {
            const errorMessages = (e as any).errors.map((err: any) => `• ${err.message}`).join('\n');
            await ctx.reply(`❌ Validation errors:\n${errorMessages}\n\nPlease fix these issues and try again.`);
          } else {
            await ctx.reply('❌ There was an error saving your listing. Please try again.');
          }
        }
        return ctx.scene.leave();
      }
      await ctx.reply('Send a photo or /done to finish.', {
        reply_markup: Markup.inlineKeyboard([
          [Markup.button.callback('❌ Cancel', 'cancel_listing')]
        ]).reply_markup
      });
    }
  );
} 