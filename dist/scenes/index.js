"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __exportStar = (this && this.__exportStar) || function(m, exports) {
    for (var p in m) if (p !== "default" && !Object.prototype.hasOwnProperty.call(exports, p)) __createBinding(exports, m, p);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.setupScenes = setupScenes;
const telegraf_1 = require("telegraf");
const addListingWizard_1 = require("./addListingWizard");
const zod_1 = require("zod");
__exportStar(require("./addListingWizard"), exports);
function setupScenes(bot, prisma) {
    const stage = new telegraf_1.Scenes.Stage([(0, addListingWizard_1.addListingWizard)(prisma)]);
    // Add skip price button handler
    bot.action('skip_price', async (ctx) => {
        console.log('Skip price button pressed');
        await ctx.answerCbQuery();
        ctx.session.addListing = { ...ctx.session.addListing, price: undefined };
        await ctx.reply('Price skipped. Enter your location (minimum 2 characters):');
        await ctx.wizard.next();
    });
    // Add skip marketplace link button handler
    bot.action('skip_marketplace_link', async (ctx) => {
        console.log('Skip marketplace link button pressed');
        await ctx.answerCbQuery();
        ctx.session.addListing = { ...ctx.session.addListing, marketplaceLink: undefined };
        await ctx.reply('Marketplace link skipped. Send up to 5 photos (send /done when finished):');
        await ctx.wizard.next();
    });
    // Add complete listing button handler
    bot.action('complete_listing', async (ctx) => {
        console.log('Complete listing button pressed');
        await ctx.answerCbQuery();
        try {
            // Simulate the /done command by calling the wizard's completion logic
            const data = addListingWizard_1.addListingSchema.parse(ctx.session.addListing);
            console.log('Saving listing data:', data);
            // Use ctx.prisma to save the listing
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
    });
    // Add cancel listing button handler
    bot.action('cancel_listing', async (ctx) => {
        console.log('Cancel listing button pressed');
        await ctx.answerCbQuery();
        // Clean up wizard messages if they exist
        if (ctx.session.wizardMessageIds && ctx.session.wizardMessageIds.length > 0) {
            try {
                console.log(`Cleaning up ${ctx.session.wizardMessageIds.length} wizard messages on cancel`);
                // Delete all wizard messages
                for (const messageId of ctx.session.wizardMessageIds) {
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
                console.error('Error cleaning up wizard messages on cancel:', error);
            }
        }
        await ctx.reply('❌ Listing creation cancelled.');
        await ctx.scene.leave();
        // Import and call the showMainMenu function
        const { showMainMenu } = require('../commands/start');
        await showMainMenu(ctx);
    });
    // Add completion option handlers
    bot.action('cleanup_and_menu', async (ctx) => {
        console.log('Cleanup and menu button pressed');
        await ctx.answerCbQuery();
        try {
            // Clean up all wizard messages
            if (ctx.session.wizardMessageIds && ctx.session.wizardMessageIds.length > 0) {
                console.log(`Cleaning up ${ctx.session.wizardMessageIds.length} wizard messages`);
                for (const messageId of ctx.session.wizardMessageIds) {
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
            // Leave the scene
            await ctx.scene.leave();
            // Show new main menu
            const { showMainMenu } = require('../commands/start');
            await showMainMenu(ctx);
        }
        catch (error) {
            console.error('Error in cleanup and menu:', error);
            await ctx.reply('❌ Error during cleanup. Please try again.');
        }
    });
    bot.action('return_to_menu', async (ctx) => {
        console.log('Return to menu button pressed');
        await ctx.answerCbQuery();
        try {
            // Leave the scene
            await ctx.scene.leave();
            // Show main menu (will update existing message if available)
            const { showMainMenu } = require('../commands/start');
            await showMainMenu(ctx);
        }
        catch (error) {
            console.error('Error returning to menu:', error);
            await ctx.reply('❌ Error returning to menu. Please try again.');
        }
    });
    bot.action('keep_conversation', async (ctx) => {
        console.log('Keep conversation button pressed');
        await ctx.answerCbQuery();
        try {
            // Just leave the scene, keep all messages
            await ctx.scene.leave();
            // Send a simple message that they can continue using the bot
            await ctx.reply('✅ Conversation kept! You can continue using the bot with /start or /menu commands.');
        }
        catch (error) {
            console.error('Error keeping conversation:', error);
            await ctx.reply('❌ Error. Please try again.');
        }
    });
    bot.use(stage.middleware());
}
