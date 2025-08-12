"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.addListingSchema = void 0;
exports.addListingWizard = addListingWizard;
const telegraf_1 = require("telegraf");
const zod_1 = require("zod");
const addListingSchema = zod_1.z.object({
    title: zod_1.z.string().min(3, "Title must be at least 3 characters long").max(100, "Title must be 100 characters or less"),
    description: zod_1.z.string().min(10, "Description must be at least 10 characters long").max(1000, "Description must be 1000 characters or less"),
    price: zod_1.z.string().max(50, "Price must be 50 characters or less").optional(),
    location: zod_1.z.string().min(2, "Location must be at least 2 characters long").max(100, "Location must be 100 characters or less"),
    contact: zod_1.z.string().min(2, "Contact must be at least 2 characters long").max(100, "Contact must be 100 characters or less"),
    marketplaceLink: zod_1.z.string().url("Please provide a valid URL").optional(),
    photos: zod_1.z.array(zod_1.z.string()).max(5, "Maximum 5 photos allowed"),
});
exports.addListingSchema = addListingSchema;
function addListingWizard(prisma) {
    return new telegraf_1.Scenes.WizardScene('add-listing-wizard', async (ctx) => {
        ctx.session.addListing = {};
        ctx.session.wizardMessageIds = []; // Store wizard message IDs for cleanup
        const sent = await ctx.reply('Enter the title of your listing (minimum 3 characters):', {
            reply_markup: telegraf_1.Markup.inlineKeyboard([
                [telegraf_1.Markup.button.callback('❌ Cancel', 'cancel_listing')]
            ]).reply_markup
        });
        ctx.session.wizardMessageIds.push(sent.message_id);
        return ctx.wizard.next();
    }, async (ctx) => {
        if (ctx.message && 'text' in ctx.message) {
            try {
                // Validate title length immediately
                if (ctx.message.text.length < 3) {
                    const sent = await ctx.reply('❌ Title is too short! It must be at least 3 characters long. Please try again:', {
                        reply_markup: telegraf_1.Markup.inlineKeyboard([
                            [telegraf_1.Markup.button.callback('❌ Cancel', 'cancel_listing')]
                        ]).reply_markup
                    });
                    ctx.session.wizardMessageIds.push(sent.message_id);
                    return;
                }
                ctx.session.addListing = { ...ctx.session.addListing, title: ctx.message.text };
                const sent = await ctx.reply('Enter a description (minimum 10 characters):', {
                    reply_markup: telegraf_1.Markup.inlineKeyboard([
                        [telegraf_1.Markup.button.callback('❌ Cancel', 'cancel_listing')]
                    ]).reply_markup
                });
                ctx.session.wizardMessageIds.push(sent.message_id);
                return ctx.wizard.next();
            }
            catch (error) {
                const sent = await ctx.reply('❌ Invalid title. Please try again:', {
                    reply_markup: telegraf_1.Markup.inlineKeyboard([
                        [telegraf_1.Markup.button.callback('❌ Cancel', 'cancel_listing')]
                    ]).reply_markup
                });
                ctx.session.wizardMessageIds.push(sent.message_id);
            }
        }
        const sent = await ctx.reply('Please send text for the title (minimum 3 characters).', {
            reply_markup: telegraf_1.Markup.inlineKeyboard([
                [telegraf_1.Markup.button.callback('❌ Cancel', 'cancel_listing')]
            ]).reply_markup
        });
        ctx.session.wizardMessageIds.push(sent.message_id);
    }, async (ctx) => {
        if (ctx.message && 'text' in ctx.message) {
            try {
                // Validate description length immediately
                if (ctx.message.text.length < 10) {
                    const sent = await ctx.reply('❌ Description is too short! It must be at least 10 characters long. Please try again:', {
                        reply_markup: telegraf_1.Markup.inlineKeyboard([
                            [telegraf_1.Markup.button.callback('❌ Cancel', 'cancel_listing')]
                        ]).reply_markup
                    });
                    ctx.session.wizardMessageIds.push(sent.message_id);
                    return;
                }
                ctx.session.addListing = { ...ctx.session.addListing, description: ctx.message.text };
                const sent = await ctx.reply('Enter a price or use the skip button below:', {
                    reply_markup: telegraf_1.Markup.inlineKeyboard([
                        [telegraf_1.Markup.button.callback('⏭️ Skip Price', 'skip_price')],
                        [telegraf_1.Markup.button.callback('❌ Cancel', 'cancel_listing')]
                    ]).reply_markup
                });
                ctx.session.wizardMessageIds.push(sent.message_id);
                return ctx.wizard.next();
            }
            catch (error) {
                const sent = await ctx.reply('❌ Invalid description. Please try again:', {
                    reply_markup: telegraf_1.Markup.inlineKeyboard([
                        [telegraf_1.Markup.button.callback('❌ Cancel', 'cancel_listing')]
                    ]).reply_markup
                });
                ctx.session.wizardMessageIds.push(sent.message_id);
            }
        }
        const sent = await ctx.reply('Please send text for the description (minimum 10 characters).', {
            reply_markup: telegraf_1.Markup.inlineKeyboard([
                [telegraf_1.Markup.button.callback('❌ Cancel', 'cancel_listing')]
            ]).reply_markup
        });
        ctx.session.wizardMessageIds.push(sent.message_id);
    }, async (ctx) => {
        if (ctx.message && 'text' in ctx.message) {
            const price = ctx.message.text.trim();
            ctx.session.addListing = { ...ctx.session.addListing, price };
            const sent = await ctx.reply('Enter your location (minimum 2 characters):', {
                reply_markup: telegraf_1.Markup.inlineKeyboard([
                    [telegraf_1.Markup.button.callback('❌ Cancel', 'cancel_listing')]
                ]).reply_markup
            });
            ctx.session.wizardMessageIds.push(sent.message_id);
            return ctx.wizard.next();
        }
        const sent = await ctx.reply('Please send text for the price or use the skip button.', {
            reply_markup: telegraf_1.Markup.inlineKeyboard([
                [telegraf_1.Markup.button.callback('❌ Cancel', 'cancel_listing')]
            ]).reply_markup
        });
        ctx.session.wizardMessageIds.push(sent.message_id);
    }, async (ctx) => {
        if (ctx.message && 'text' in ctx.message) {
            try {
                // Validate location length immediately
                if (ctx.message.text.length < 2) {
                    const sent = await ctx.reply('❌ Location is too short! It must be at least 2 characters long. Please try again:', {
                        reply_markup: telegraf_1.Markup.inlineKeyboard([
                            [telegraf_1.Markup.button.callback('❌ Cancel', 'cancel_listing')]
                        ]).reply_markup
                    });
                    ctx.session.wizardMessageIds.push(sent.message_id);
                    return;
                }
                ctx.session.addListing = { ...ctx.session.addListing, location: ctx.message.text };
                const sent = await ctx.reply('Enter your contact info (minimum 2 characters):', {
                    reply_markup: telegraf_1.Markup.inlineKeyboard([
                        [telegraf_1.Markup.button.callback('❌ Cancel', 'cancel_listing')]
                    ]).reply_markup
                });
                ctx.session.wizardMessageIds.push(sent.message_id);
                return ctx.wizard.next();
            }
            catch (error) {
                const sent = await ctx.reply('❌ Invalid location. Please try again:', {
                    reply_markup: telegraf_1.Markup.inlineKeyboard([
                        [telegraf_1.Markup.button.callback('❌ Cancel', 'cancel_listing')]
                    ]).reply_markup
                });
                ctx.session.wizardMessageIds.push(sent.message_id);
            }
        }
        const sent = await ctx.reply('Please send text for the location (minimum 2 characters).', {
            reply_markup: telegraf_1.Markup.inlineKeyboard([
                [telegraf_1.Markup.button.callback('❌ Cancel', 'cancel_listing')]
            ]).reply_markup
        });
        ctx.session.wizardMessageIds.push(sent.message_id);
    }, async (ctx) => {
        if (ctx.message && 'text' in ctx.message) {
            try {
                // Validate contact length immediately
                if (ctx.message.text.length < 2) {
                    const sent = await ctx.reply('❌ Contact info is too short! It must be at least 2 characters long. Please try again:', {
                        reply_markup: telegraf_1.Markup.inlineKeyboard([
                            [telegraf_1.Markup.button.callback('❌ Cancel', 'cancel_listing')]
                        ]).reply_markup
                    });
                    ctx.session.wizardMessageIds.push(sent.message_id);
                    return;
                }
                ctx.session.addListing = { ...ctx.session.addListing, contact: ctx.message.text, photos: [] };
                const sent = await ctx.reply('Do you have a marketplace link (e.g., eBay, Reverb, etc.)? Send the URL or use the skip button:', {
                    reply_markup: telegraf_1.Markup.inlineKeyboard([
                        [telegraf_1.Markup.button.callback('⏭️ Skip Marketplace Link', 'skip_marketplace_link')],
                        [telegraf_1.Markup.button.callback('❌ Cancel', 'cancel_listing')]
                    ]).reply_markup
                });
                ctx.session.wizardMessageIds.push(sent.message_id);
                return ctx.wizard.next();
            }
            catch (error) {
                const sent = await ctx.reply('❌ Invalid contact info. Please try again:', {
                    reply_markup: telegraf_1.Markup.inlineKeyboard([
                        [telegraf_1.Markup.button.callback('❌ Cancel', 'cancel_listing')]
                    ]).reply_markup
                });
                ctx.session.wizardMessageIds.push(sent.message_id);
            }
        }
        const sent = await ctx.reply('Please send text for the contact info (minimum 2 characters).', {
            reply_markup: telegraf_1.Markup.inlineKeyboard([
                [telegraf_1.Markup.button.callback('❌ Cancel', 'cancel_listing')]
            ]).reply_markup
        });
        ctx.session.wizardMessageIds.push(sent.message_id);
    }, async (ctx) => {
        if (ctx.message && 'text' in ctx.message) {
            const marketplaceLink = ctx.message.text.trim();
            ctx.session.addListing = { ...ctx.session.addListing, marketplaceLink };
            const sent = await ctx.reply('Send up to 5 photos (send /done when finished):', {
                reply_markup: telegraf_1.Markup.inlineKeyboard([
                    [telegraf_1.Markup.button.callback('❌ Cancel', 'cancel_listing')]
                ]).reply_markup
            });
            ctx.session.wizardMessageIds.push(sent.message_id);
            return ctx.wizard.next();
        }
        if (ctx.message && 'text' in ctx.message && ctx.message.text === '/done') {
            // Validate and save
            try {
                const data = addListingSchema.parse(ctx.session.addListing);
                console.log('Saving listing data:', data);
                // Use ctx.prisma instead of parameter
                const user = await ctx.prisma.user.upsert({
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
                const listing = await ctx.prisma.listing.create({
                    data: {
                        userId: user.id,
                        title: data.title,
                        description: data.description,
                        price: data.price,
                        location: data.location,
                        marketplaceLink: data.marketplaceLink,
                        photos: JSON.stringify(data.photos),
                    },
                });
                console.log('Listing created:', listing);
                // Success message with options
                const successSent = await ctx.reply('🎉 Your listing has been added successfully!', {
                    reply_markup: telegraf_1.Markup.inlineKeyboard([
                        [telegraf_1.Markup.button.callback('🧹 Clean Up & New Menu', 'cleanup_and_menu')],
                        [telegraf_1.Markup.button.callback('🔙 Return to Menu', 'return_to_menu')],
                        [telegraf_1.Markup.button.callback('💬 Keep Conversation', 'keep_conversation')]
                    ]).reply_markup
                });
                // Store the success message ID for potential cleanup
                ctx.session.wizardMessageIds.push(successSent.message_id);
                // Don't auto-cleanup, let user choose
                // await cleanupWizardMessages(ctx);
                // Don't auto-return to menu, let user choose
                // const { showMainMenu } = require('../commands/start');
                // await showMainMenu(ctx);
            }
            catch (e) {
                console.error('Error saving listing:', e);
                if (e instanceof zod_1.z.ZodError) {
                    const errorMessages = e.errors.map((err) => `• ${err.message}`).join('\n');
                    const errorSent = await ctx.reply(`❌ Validation errors:\n${errorMessages}\n\nPlease fix these issues and try again.`);
                    ctx.session.wizardMessageIds.push(errorSent.message_id);
                }
                else {
                    const errorSent = await ctx.reply('❌ There was an error saving your listing. Please try again.');
                    ctx.session.wizardMessageIds.push(errorSent.message_id);
                }
            }
            return ctx.scene.leave();
        }
        if (ctx.message && 'photo' in ctx.message) {
            const fileId = ctx.message.photo[ctx.message.photo.length - 1].file_id;
            ctx.session.addListing.photos = ctx.session.addListing.photos || [];
            if (ctx.session.addListing.photos.length < 5) {
                ctx.session.addListing.photos.push(fileId);
                const sent = await ctx.reply(`📸 Photo ${ctx.session.addListing.photos.length}/5 received. Send more or complete:`, {
                    reply_markup: telegraf_1.Markup.inlineKeyboard([
                        [telegraf_1.Markup.button.callback('✅ Complete Listing', 'complete_listing')],
                        [telegraf_1.Markup.button.callback('❌ Cancel', 'cancel_listing')]
                    ]).reply_markup
                });
                ctx.session.wizardMessageIds.push(sent.message_id);
            }
            else {
                const sent = await ctx.reply('📸 You have reached the maximum of 5 photos. Complete your listing:', {
                    reply_markup: telegraf_1.Markup.inlineKeyboard([
                        [telegraf_1.Markup.button.callback('✅ Complete Listing', 'complete_listing')],
                        [telegraf_1.Markup.button.callback('❌ Cancel', 'cancel_listing')]
                    ]).reply_markup
                });
                ctx.session.wizardMessageIds.push(sent.message_id);
            }
            return;
        }
        const sent = await ctx.reply('Send a photo or complete your listing:', {
            reply_markup: telegraf_1.Markup.inlineKeyboard([
                [telegraf_1.Markup.button.callback('✅ Complete Listing', 'complete_listing')],
                [telegraf_1.Markup.button.callback('❌ Cancel', 'cancel_listing')]
            ]).reply_markup
        });
        ctx.session.wizardMessageIds.push(sent.message_id);
    });
}
// Helper function to clean up wizard messages
async function cleanupWizardMessages(ctx) {
    try {
        const wizardMessageIds = ctx.session.wizardMessageIds || [];
        console.log(`Cleaning up ${wizardMessageIds.length} wizard messages`);
        // Delete all wizard messages
        for (const messageId of wizardMessageIds) {
            try {
                await ctx.telegram.deleteMessage(ctx.chat.id, messageId);
            }
            catch (error) {
                console.log(`Failed to delete message ${messageId}:`, error);
            }
        }
        // Clear the wizard message IDs
        ctx.session.wizardMessageIds = [];
    }
    catch (error) {
        console.error('Error cleaning up wizard messages:', error);
    }
}
