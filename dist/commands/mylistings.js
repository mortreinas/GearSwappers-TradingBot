"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.handleMyListings = handleMyListings;
exports.registerMyListingsCommand = registerMyListingsCommand;
const telegraf_1 = require("telegraf");
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
async function handleMyListings(ctx, prisma) {
    try {
        if (ctx.chat?.type !== 'private')
            return;
        // Clean slate: Delete old bot messages and start fresh
        await cleanBotMessages(ctx);
        const user = await prisma.user.findUnique({ where: { telegramId: String(ctx.from?.id) }, include: { listings: true } });
        if (!user || !user.listings.length) {
            const noListingsText = `📦 *My Listings*\n\nYou have no listings.`;
            const noListingsButtons = telegraf_1.Markup.inlineKeyboard([
                [telegraf_1.Markup.button.callback('➕ Add Your First Listing', 'add_listing')],
                [telegraf_1.Markup.button.callback('🔙 Back to Menu', 'back_to_menu')],
            ]).reply_markup;
            // Always send a fresh message with interactive menu
            const sent = await ctx.reply(noListingsText, {
                parse_mode: 'Markdown',
                reply_markup: noListingsButtons
            });
            // Store this as the main interactive message
            if (!ctx.session)
                ctx.session = {};
            ctx.session.mainMessageId = sent.message_id;
            if (ctx.callbackQuery)
                await ctx.answerCbQuery();
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
        // Always send a fresh interactive menu as the LAST message
        const myListingsText = `📦 *My Listings*\n\nManage your ${user.listings.length} listing(s):`;
        const myListingsButtons = telegraf_1.Markup.inlineKeyboard(listingButtons).reply_markup;
        // Send new message with the interactive menu
        const sent = await ctx.reply(myListingsText, {
            parse_mode: 'Markdown',
            reply_markup: myListingsButtons
        });
        // Store this as the main interactive message
        if (!ctx.session)
            ctx.session = {};
        ctx.session.mainMessageId = sent.message_id;
        if (ctx.callbackQuery)
            await ctx.answerCbQuery();
    }
    catch (error) {
        console.error('Error in handleMyListings:', error);
        const errorText = `❌ *Error*\n\nSorry, there was an error loading your listings. Please try again.`;
        const errorButtons = telegraf_1.Markup.inlineKeyboard([
            [telegraf_1.Markup.button.callback('🔙 Back to Menu', 'back_to_menu')],
        ]).reply_markup;
        // Always send a fresh error message with interactive menu
        const sent = await ctx.reply(errorText, {
            parse_mode: 'Markdown',
            reply_markup: errorButtons
        });
        // Store this as the main interactive message
        if (!ctx.session)
            ctx.session = {};
        ctx.session.mainMessageId = sent.message_id;
    }
}
const editStates = {};
function registerMyListingsCommand(bot, prisma) {
    bot.command('mylistings', async (ctx) => {
        try {
            console.log('/mylistings command triggered');
            await handleMyListings(ctx, prisma);
        }
        catch (error) {
            console.error('Error in mylistings command:', error);
            await ctx.reply('Sorry, there was an error. Please try again.', {
                reply_markup: telegraf_1.Markup.inlineKeyboard([
                    [telegraf_1.Markup.button.callback('🔙 Back to Menu', 'back_to_menu')],
                ]).reply_markup
            });
        }
    });
    bot.action(/delete_listing_(\d+)/, async (ctx) => {
        try {
            if (ctx.chat?.type !== 'private')
                return;
            const listingId = parseInt(ctx.match[1], 10);
            const listing = await prisma.listing.findUnique({ where: { id: listingId } });
            if (!listing) {
                await ctx.answerCbQuery('Listing not found.');
                return;
            }
            if (listing.userId) {
                await prisma.listing.delete({ where: { id: listingId } });
                // Check if user has more listings
                const user = await prisma.user.findUnique({ where: { id: listing.userId }, include: { listings: true } });
                if (user && user.listings.length === 0) {
                    await prisma.user.delete({ where: { id: user.id } });
                }
                await ctx.reply('Listing deleted successfully!', {
                    reply_markup: telegraf_1.Markup.inlineKeyboard([
                        [telegraf_1.Markup.button.callback('🔙 Back to Menu', 'back_to_menu')],
                    ]).reply_markup
                });
            }
            await ctx.answerCbQuery();
        }
        catch (error) {
            console.error('Error deleting listing:', error);
            await ctx.answerCbQuery('Error deleting listing');
        }
    });
    // Edit listing flow
    bot.action(/edit_listing_(\d+)/, async (ctx) => {
        try {
            if (ctx.chat?.type !== 'private')
                return;
            const listingId = parseInt(ctx.match[1], 10);
            const listing = await prisma.listing.findUnique({ where: { id: listingId } });
            if (!listing) {
                await ctx.answerCbQuery('Listing not found.');
                return;
            }
            if (ctx.from?.id) {
                editStates[ctx.from.id] = { step: 0, listingId, data: { ...listing, photos: JSON.parse(listing.photos || '[]') } };
            }
            await ctx.reply('What do you want to edit?', {
                reply_markup: telegraf_1.Markup.inlineKeyboard([
                    [telegraf_1.Markup.button.callback('Title', 'edit_field_title')],
                    [telegraf_1.Markup.button.callback('Description', 'edit_field_description')],
                    [telegraf_1.Markup.button.callback('Price', 'edit_field_price')],
                    [telegraf_1.Markup.button.callback('Location', 'edit_field_location')],
                    [telegraf_1.Markup.button.callback('Contact', 'edit_field_contact')],
                    [telegraf_1.Markup.button.callback('Done', 'edit_field_done')],
                    [telegraf_1.Markup.button.callback('🔙 Back to Menu', 'back_to_menu')]
                ]).reply_markup
            });
            await ctx.answerCbQuery();
        }
        catch (error) {
            console.error('Error editing listing:', error);
            await ctx.answerCbQuery('Error editing listing');
        }
    });
    bot.action(/edit_field_(title|description|price|location|contact)/, async (ctx) => {
        try {
            if (ctx.from?.id) {
                const userState = editStates[ctx.from.id];
                if (!userState)
                    return;
                const field = ctx.match[1];
                userState.editingField = field;
                await ctx.reply(`Send new value for ${field}:`);
            }
            await ctx.answerCbQuery();
        }
        catch (error) {
            console.error('Error in edit field action:', error);
            await ctx.answerCbQuery('Error editing field');
        }
    });
    bot.action('edit_field_done', async (ctx) => {
        try {
            if (ctx.from?.id) {
                const userState = editStates[ctx.from.id];
                if (!userState)
                    return;
                // Save changes
                const { listingId, data } = userState;
                await prisma.listing.update({
                    where: { id: listingId },
                    data: {
                        title: data.title,
                        description: data.description,
                        price: data.price,
                        location: data.location,
                        photos: JSON.stringify(data.photos),
                    },
                });
                delete editStates[ctx.from.id];
                await ctx.reply('Listing updated successfully!', {
                    reply_markup: telegraf_1.Markup.inlineKeyboard([
                        [telegraf_1.Markup.button.callback('🔙 Back to Menu', 'back_to_menu')],
                    ]).reply_markup
                });
            }
            await ctx.answerCbQuery();
        }
        catch (error) {
            console.error('Error updating listing:', error);
            await ctx.answerCbQuery('Error updating listing');
        }
    });
    bot.on('text', async (ctx, next) => {
        try {
            if (ctx.from?.id) {
                const userState = editStates[ctx.from.id];
                if (!userState || !userState.editingField)
                    return next();
                const field = userState.editingField;
                userState.data[field] = ctx.message.text;
                userState.editingField = undefined;
                await ctx.reply(`${field.charAt(0).toUpperCase() + field.slice(1)} updated.`);
                await ctx.reply('What do you want to edit next?', {
                    reply_markup: telegraf_1.Markup.inlineKeyboard([
                        [telegraf_1.Markup.button.callback('Title', 'edit_field_title')],
                        [telegraf_1.Markup.button.callback('Description', 'edit_field_description')],
                        [telegraf_1.Markup.button.callback('Price', 'edit_field_price')],
                        [telegraf_1.Markup.button.callback('Location', 'edit_field_location')],
                        [telegraf_1.Markup.button.callback('Contact', 'edit_field_contact')],
                        [telegraf_1.Markup.button.callback('Done', 'edit_field_done')],
                        [telegraf_1.Markup.button.callback('🔙 Back to Menu', 'back_to_menu')]
                    ]).reply_markup
                });
            }
        }
        catch (error) {
            console.error('Error in text handler:', error);
        }
    });
}
