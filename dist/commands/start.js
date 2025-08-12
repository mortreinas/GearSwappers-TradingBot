"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.showMainMenu = showMainMenu;
exports.registerStartCommand = registerStartCommand;
const telegraf_1 = require("telegraf");
const add_1 = require("./add");
// Helper function to clean up old bot messages and start fresh
async function cleanBotMessages(ctx) {
    try {
        // Clear session data
        if (ctx.session) {
            ctx.session.mainMessageId = undefined;
            ctx.session.wizardMessageIds = [];
            ctx.session.navigationMessageId = undefined;
        }
        // Try to delete the main message if it exists
        if (ctx.session && ctx.session.mainMessageId) {
            try {
                await ctx.telegram.deleteMessage(ctx.chat.id, ctx.session.mainMessageId);
            }
            catch (error) {
                console.log('Could not delete main message:', error);
            }
        }
        // Try to delete navigation message if it exists
        if (ctx.session && ctx.session.navigationMessageId) {
            try {
                await ctx.telegram.deleteMessage(ctx.chat.id, ctx.session.navigationMessageId);
            }
            catch (error) {
                console.log('Could not delete navigation message:', error);
            }
        }
        // Try to delete wizard messages if they exist
        if (ctx.session && ctx.session.wizardMessageIds) {
            for (const messageId of ctx.session.wizardMessageIds) {
                try {
                    await ctx.telegram.deleteMessage(ctx.chat.id, messageId);
                }
                catch (error) {
                    console.log('Could not delete wizard message:', error);
                }
            }
            ctx.session.wizardMessageIds = [];
        }
        console.log('Cleaned up old bot messages');
    }
    catch (error) {
        console.error('Error cleaning bot messages:', error);
    }
}
// Main menu function that can be called from anywhere
async function showMainMenu(ctx) {
    try {
        // Get only active listings count
        const totalListings = await ctx.prisma.listing.count();
        const menuText = `🎸 *GearTrader Main Menu*\n\n` +
            `📊 *Active Listings:* ${totalListings}\n\n` +
            `Choose what you'd like to do:`;
        const menuButtons = telegraf_1.Markup.inlineKeyboard([
            [telegraf_1.Markup.button.callback('🎛 Browse Listings', 'browse_listings')],
            [telegraf_1.Markup.button.callback('➕ Add New Listing', 'add_listing')],
            [telegraf_1.Markup.button.callback('📦 My Listings', 'my_listings')],
            [telegraf_1.Markup.button.callback('ℹ️ Help & Info', 'help_info')],
            [telegraf_1.Markup.button.callback('🔄 Refresh', 'refresh_stats')],
        ]).reply_markup;
        // Ensure session exists and has mainMessageId
        if (ctx.session && ctx.session.mainMessageId) {
            try {
                await ctx.telegram.editMessageText(ctx.chat.id, ctx.session.mainMessageId, undefined, menuText, { parse_mode: 'Markdown', reply_markup: menuButtons });
                return;
            }
            catch (error) {
                if (error.description?.includes('message is not modified')) {
                    console.log('Message content unchanged, skipping edit');
                    return;
                }
                else {
                    console.log('Failed to edit message, sending new one');
                }
            }
        }
        // Send new message and store its ID
        const sent = await ctx.reply(menuText, {
            parse_mode: 'Markdown',
            reply_markup: menuButtons
        });
        // Initialize session if it doesn't exist
        if (!ctx.session) {
            ctx.session = {};
        }
        ctx.session.mainMessageId = sent.message_id;
    }
    catch (error) {
        console.error('Error loading menu statistics:', error);
        // Fallback menu without statistics if there's an error
        const fallbackMenuText = `🎸 *GearTrader Main Menu*\n\nChoose what you'd like to do:`;
        const fallbackMenuButtons = telegraf_1.Markup.inlineKeyboard([
            [telegraf_1.Markup.button.callback('🎛 Browse Listings', 'browse_listings')],
            [telegraf_1.Markup.button.callback('➕ Add New Listing', 'add_listing')],
            [telegraf_1.Markup.button.callback('📦 My Listings', 'my_listings')],
            [telegraf_1.Markup.button.callback('ℹ️ Help & Info', 'help_info')],
            [telegraf_1.Markup.button.callback('🔄 Refresh', 'refresh_stats')],
        ]).reply_markup;
        // Ensure session exists and has mainMessageId
        if (ctx.session && ctx.session.mainMessageId) {
            try {
                await ctx.telegram.editMessageText(ctx.chat.id, ctx.session.mainMessageId, undefined, fallbackMenuText, { parse_mode: 'Markdown', reply_markup: fallbackMenuButtons });
                return;
            }
            catch (error) {
                if (error.description?.includes('message is not modified')) {
                    console.log('Message content unchanged, skipping edit');
                    return;
                }
                else {
                    console.log('Failed to edit fallback message, sending new one');
                }
            }
        }
        // Send new fallback message and store its ID
        const sent = await ctx.reply(fallbackMenuText, {
            parse_mode: 'Markdown',
            reply_markup: fallbackMenuButtons
        });
        // Initialize session if it doesn't exist
        if (!ctx.session) {
            ctx.session = {};
        }
        ctx.session.mainMessageId = sent.message_id;
    }
}
function registerStartCommand(bot, prisma) {
    // Start command shows welcome message and main menu
    bot.start(async (ctx) => {
        if (ctx.chat?.type !== 'private')
            return;
        try {
            // Clean slate: Delete old bot messages and start fresh
            await cleanBotMessages(ctx);
            // Send welcome message
            await ctx.reply(`Welcome to GearTrader! 🎸\n\n` +
                `This bot helps you trade musical gear (no money involved).\n\n` +
                `🔒 *Privacy Notice:*\n` +
                `Your contact info and user data are stored *only while your listing is live*.\n` +
                `As soon as you delete your last listing, all your data is permanently deleted.\n` +
                `No personal information is retained longer than necessary.`, { parse_mode: 'Markdown' });
            // Always send the main menu as the LAST message
            await showMainMenu(ctx);
        }
        catch (error) {
            console.error('Error in start command:', error);
            // Fallback if cleanup fails
            await ctx.reply('Welcome to GearTrader! 🎸');
            await showMainMenu(ctx);
        }
    });
    // Menu command to show main menu anytime
    bot.command('menu', async (ctx) => {
        if (ctx.chat?.type !== 'private')
            return;
        try {
            // Clean slate: Delete old bot messages and start fresh
            await cleanBotMessages(ctx);
            // Always send the main menu as the LAST message
            await showMainMenu(ctx);
        }
        catch (error) {
            console.error('Error in menu command:', error);
            await showMainMenu(ctx);
        }
    });
    // Handle menu button actions
    bot.action('browse_listings', async (ctx) => {
        await ctx.answerCbQuery();
        try {
            const listings = await prisma.listing.findMany({
                orderBy: { createdAt: 'desc' },
                include: { user: true },
            });
            if (!listings.length) {
                // Update the main message to show no listings
                const noListingsText = `📭 *No Listings Found*\n\nBe the first to add one! 🎸`;
                const noListingsButtons = telegraf_1.Markup.inlineKeyboard([
                    [telegraf_1.Markup.button.callback('➕ Add New Listing', 'add_listing')],
                    [telegraf_1.Markup.button.callback('🔙 Back to Menu', 'back_to_menu')],
                ]).reply_markup;
                if (ctx.session && ctx.session.mainMessageId) {
                    try {
                        await ctx.telegram.editMessageText(ctx.chat.id, ctx.session.mainMessageId, undefined, noListingsText, { parse_mode: 'Markdown', reply_markup: noListingsButtons });
                    }
                    catch (error) {
                        if (error.description?.includes('message is not modified')) {
                            console.log('Message content unchanged, skipping edit');
                        }
                        else {
                            console.error('Error editing no listings message:', error);
                            // Fallback to sending new message
                            const sent = await ctx.reply(noListingsText, {
                                parse_mode: 'Markdown',
                                reply_markup: noListingsButtons
                            });
                            ctx.session.mainMessageId = sent.message_id;
                        }
                    }
                }
                else {
                    const sent = await ctx.reply(noListingsText, {
                        parse_mode: 'Markdown',
                        reply_markup: noListingsButtons
                    });
                    ctx.session.mainMessageId = sent.message_id;
                }
                return;
            }
            // Show all as buttons: just the title
            const buttons = listings.map(listing => {
                return [telegraf_1.Markup.button.callback(listing.title, `show_listing_${listing.id}`)];
            });
            // Add back to menu button
            buttons.push([telegraf_1.Markup.button.callback('🔙 Back to Menu', 'back_to_menu')]);
            // Update the main message to show listings
            const listingsText = `📋 *Available Listings*\n\nFound ${listings.length} listings. Select one to view details:`;
            const listingsButtons = telegraf_1.Markup.inlineKeyboard(buttons).reply_markup;
            if (ctx.session && ctx.session.mainMessageId) {
                await ctx.telegram.editMessageText(ctx.chat.id, ctx.session.mainMessageId, undefined, listingsText, { parse_mode: 'Markdown', reply_markup: listingsButtons });
            }
            else {
                await ctx.reply(listingsText, { reply_markup: listingsButtons });
            }
        }
        catch (error) {
            console.error('Error loading listings:', error);
            const errorText = `❌ *Error*\n\nSorry, there was an error loading the listings. Please try again.`;
            const errorButtons = telegraf_1.Markup.inlineKeyboard([
                [telegraf_1.Markup.button.callback('🔙 Back to Menu', 'back_to_menu')],
            ]).reply_markup;
            if (ctx.session && ctx.session.mainMessageId) {
                try {
                    await ctx.telegram.editMessageText(ctx.chat.id, ctx.session.mainMessageId, undefined, errorText, { parse_mode: 'Markdown', reply_markup: errorButtons });
                }
                catch (error) {
                    if (error.description?.includes('message is not modified')) {
                        console.log('Message content unchanged, skipping edit');
                    }
                    else {
                        console.error('Error editing error message:', error);
                        // Fallback to sending new message
                        const sent = await ctx.reply(errorText, {
                            parse_mode: 'Markdown',
                            reply_markup: errorButtons
                        });
                        ctx.session.mainMessageId = sent.message_id;
                    }
                }
            }
            else {
                const sent = await ctx.reply(errorText, {
                    parse_mode: 'Markdown',
                    reply_markup: errorButtons
                });
                ctx.session.mainMessageId = sent.message_id;
            }
        }
    });
    bot.action('add_listing', async (ctx) => {
        await ctx.answerCbQuery();
        await (0, add_1.handleAddListing)(ctx);
    });
    bot.action('my_listings', async (ctx) => {
        await ctx.answerCbQuery();
        try {
            const user = await prisma.user.findUnique({
                where: { telegramId: String(ctx.from?.id) },
                include: { listings: true }
            });
            if (!user || !user.listings.length) {
                const noListingsText = `📦 *My Listings*\n\nYou have no listings.`;
                const noListingsButtons = telegraf_1.Markup.inlineKeyboard([
                    [telegraf_1.Markup.button.callback('➕ Add Your First Listing', 'add_listing')],
                    [telegraf_1.Markup.button.callback('🔙 Back to Menu', 'back_to_menu')],
                ]).reply_markup;
                if (ctx.session && ctx.session.mainMessageId) {
                    await ctx.telegram.editMessageText(ctx.chat.id, ctx.session.mainMessageId, undefined, noListingsText, { parse_mode: 'Markdown', reply_markup: noListingsButtons });
                }
                else {
                    await ctx.reply(noListingsText, { reply_markup: noListingsButtons });
                }
                return;
            }
            // Create buttons for user's listings
            const listingButtons = user.listings.map(listing => [
                telegraf_1.Markup.button.callback(`✏️ ${listing.title}`, `edit_listing_${listing.id}`),
                telegraf_1.Markup.button.callback(`🗑️ ${listing.title}`, `delete_listing_${listing.id}`)
            ]);
            // Add management buttons
            listingButtons.push([telegraf_1.Markup.button.callback('➕ Add New Listing', 'add_listing')]);
            listingButtons.push([telegraf_1.Markup.button.callback('🔙 Back to Menu', 'back_to_menu')]);
            const myListingsText = `📦 *My Listings*\n\nManage your ${user.listings.length} listing(s):`;
            const myListingsButtons = telegraf_1.Markup.inlineKeyboard(listingButtons).reply_markup;
            if (ctx.session && ctx.session.mainMessageId) {
                await ctx.telegram.editMessageText(ctx.chat.id, ctx.session.mainMessageId, undefined, myListingsText, { parse_mode: 'Markdown', reply_markup: myListingsButtons });
            }
            else {
                await ctx.reply(myListingsText, { reply_markup: myListingsButtons });
            }
        }
        catch (error) {
            console.error('Error loading my listings:', error);
            const errorText = `❌ *Error*\n\nSorry, there was an error loading your listings. Please try again.`;
            const errorButtons = telegraf_1.Markup.inlineKeyboard([
                [telegraf_1.Markup.button.callback('🔙 Back to Menu', 'back_to_menu')],
            ]).reply_markup;
            if (ctx.session && ctx.session.mainMessageId) {
                try {
                    await ctx.telegram.editMessageText(ctx.chat.id, ctx.session.mainMessageId, undefined, errorText, { parse_mode: 'Markdown', reply_markup: errorButtons });
                }
                catch (error) {
                    if (error.description?.includes('message is not modified')) {
                        console.log('Message content unchanged, skipping edit');
                    }
                    else {
                        console.error('Error editing error message:', error);
                        // Fallback to sending new message
                        const sent = await ctx.reply(errorText, {
                            parse_mode: 'Markdown',
                            reply_markup: errorButtons
                        });
                        ctx.session.mainMessageId = sent.message_id;
                    }
                }
            }
            else {
                const sent = await ctx.reply(errorText, {
                    parse_mode: 'Markdown',
                    reply_markup: errorButtons
                });
                ctx.session.mainMessageId = sent.message_id;
            }
        }
    });
    bot.action('help_info', async (ctx) => {
        await ctx.answerCbQuery();
        const helpText = `🎸 *GearTrader Help*\n\n` +
            `*Commands:*\n` +
            `• /start - Show main menu with statistics\n` +
            `• /menu - Show main menu with statistics\n` +
            `• /add - Add new listing\n` +
            `• /browse - Browse all listings\n` +
            `• /listings - View all listings\n` +
            `• /mylistings - Manage your listings\n\n` +
            `*Features:*\n` +
            `• Add listings with photos\n` +
            `• Browse and search listings\n` +
            `• Contact sellers directly\n` +
            `• Manage your own listings\n` +
            `• Optional marketplace links\n` +
            `• View active listings count\n\n` +
            `*Privacy:* Your data is only stored while your listings are active.`;
        const helpButtons = telegraf_1.Markup.inlineKeyboard([
            [telegraf_1.Markup.button.callback('🔙 Back to Menu', 'back_to_menu')],
        ]).reply_markup;
        if (ctx.session && ctx.session.mainMessageId) {
            try {
                await ctx.telegram.editMessageText(ctx.chat.id, ctx.session.mainMessageId, undefined, helpText, { parse_mode: 'Markdown', reply_markup: helpButtons });
            }
            catch (error) {
                if (error.description?.includes('message is not modified')) {
                    console.log('Message content unchanged, skipping edit');
                }
                else {
                    console.error('Error editing help message:', error);
                    // Fallback to sending new message
                    const sent = await ctx.reply(helpText, {
                        parse_mode: 'Markdown',
                        reply_markup: helpButtons
                    });
                    ctx.session.mainMessageId = sent.message_id;
                }
            }
        }
        else {
            const sent = await ctx.reply(helpText, {
                parse_mode: 'Markdown',
                reply_markup: helpButtons
            });
            ctx.session.mainMessageId = sent.message_id;
        }
    });
    bot.action('back_to_menu', async (ctx) => {
        await ctx.answerCbQuery();
        await showMainMenu(ctx);
    });
    // Add refresh stats action handler
    bot.action('refresh_stats', async (ctx) => {
        await ctx.answerCbQuery();
        await showMainMenu(ctx);
    });
}
