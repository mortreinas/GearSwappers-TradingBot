"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.handleBrowseListings = handleBrowseListings;
exports.registerBrowseListingsCommand = registerBrowseListingsCommand;
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
const PAGE_SIZE = 3;
async function handleBrowseListings(ctx, prisma, page = 0) {
    try {
        if (ctx.chat?.type !== 'private')
            return;
        // Only clean messages when starting fresh (page 0), not when navigating
        if (page === 0) {
            await cleanBotMessages(ctx);
        }
        const listings = await prisma.listing.findMany({
            orderBy: { createdAt: 'desc' },
            include: { user: true },
        });
        if (!listings.length) {
            const noListingsText = `📭 *No Listings Found*\n\nNo listings available to browse.`;
            const noListingsButtons = telegraf_1.Markup.inlineKeyboard([
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
            return;
        }
        // Show only the first listing from this page
        const listing = listings[page];
        if (!listing) {
            // Page out of bounds, show first listing
            const firstListing = listings[0];
            const photos = JSON.parse(firstListing.photos || '[]');
            let msg = `*${firstListing.title}*\n${firstListing.description}\n`;
            if (firstListing.price)
                msg += `\n💵 Price: ${firstListing.price}`;
            msg += `\n📍 Location: ${firstListing.location}`;
            if (firstListing.marketplaceLink)
                msg += `\n🔗 [Marketplace Link](${firstListing.marketplaceLink})`;
            msg += `\n📞 Contact: ${firstListing.user.contact}`;
            msg += `\n\n📄 Page 1 of ${Math.ceil(listings.length / PAGE_SIZE)}`;
            const buttons = [];
            if (listings.length > 1)
                buttons.push(telegraf_1.Markup.button.callback('Next ➡️', `browse_next_0`));
            const actionButtons = [];
            if (buttons.length > 0)
                actionButtons.push(buttons);
            actionButtons.push([telegraf_1.Markup.button.callback('🔙 Back to Menu', 'back_to_menu')]);
            const replyMarkup = telegraf_1.Markup.inlineKeyboard(actionButtons).reply_markup;
            // Show the listing with photos first (can't be edited)
            if (photos.length > 0) {
                const mediaGroup = photos.map((fileId, i) => ({
                    type: 'photo', media: fileId,
                    ...(i === 0 ? { caption: msg, parse_mode: 'Markdown' } : {})
                }));
                await ctx.replyWithMediaGroup(mediaGroup);
            }
            else {
                // No photos, just send the listing text
                await ctx.reply(msg, { parse_mode: 'Markdown' });
            }
            // Always send a fresh interactive navigation menu as the LAST message
            const navigationMessage = await ctx.reply('Navigation:', { reply_markup: replyMarkup });
            // Store this navigation message ID for future editing
            if (!ctx.session)
                ctx.session = {};
            ctx.session.navigationMessageId = navigationMessage.message_id;
            return;
        }
        const photos = JSON.parse(listing.photos || '[]');
        let msg = `*${listing.title}*\n${listing.description}\n`;
        if (listing.price)
            msg += `\n💵 Price: ${listing.price}`;
        msg += `\n📍 Location: ${listing.location}`;
        if (listing.marketplaceLink)
            msg += `\n🔗 [Marketplace Link](${listing.marketplaceLink})`;
        msg += `\n📞 Contact: ${listing.user.contact}`;
        msg += `\n\n📄 Page ${page + 1} of ${Math.ceil(listings.length / PAGE_SIZE)}`;
        const buttons = [];
        if (page > 0)
            buttons.push(telegraf_1.Markup.button.callback('⬅️ Previous', `browse_prev_${page}`));
        if (page < listings.length - 1)
            buttons.push(telegraf_1.Markup.button.callback('Next ➡️', `browse_next_${page}`));
        const actionButtons = [];
        if (buttons.length > 0)
            actionButtons.push(buttons);
        actionButtons.push([telegraf_1.Markup.button.callback('🔙 Back to Menu', 'back_to_menu')]);
        const replyMarkup = telegraf_1.Markup.inlineKeyboard(actionButtons).reply_markup;
        // Show the listing with photos first (can't be edited)
        if (photos.length > 0) {
            const mediaGroup = photos.map((fileId, i) => ({
                type: 'photo', media: fileId,
                ...(i === 0 ? { caption: msg, parse_mode: 'Markdown' } : {})
            }));
            await ctx.replyWithMediaGroup(mediaGroup);
        }
        else {
            // No photos, just send the listing text
            await ctx.reply(msg, { parse_mode: 'Markdown' });
        }
        // Always send a fresh interactive navigation menu as the LAST message
        const navigationMessage = await ctx.reply('Navigation:', { reply_markup: replyMarkup });
        // Store this navigation message ID for future editing
        if (!ctx.session)
            ctx.session = {};
        ctx.session.navigationMessageId = navigationMessage.message_id;
    }
    catch (error) {
        console.error('Error in handleBrowseListings:', error);
        const errorText = `❌ *Error*\n\nSorry, there was an error loading the listings. Please try again.`;
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
function registerBrowseListingsCommand(bot, prisma) {
    bot.command('browse', async (ctx) => {
        try {
            console.log('/browse command triggered');
            if (ctx.chat?.type !== 'private')
                return;
            await handleBrowseListings(ctx, prisma, 0);
        }
        catch (error) {
            console.error('Error in browse command:', error);
            await ctx.reply('Sorry, there was an error. Please try again.', {
                reply_markup: telegraf_1.Markup.inlineKeyboard([
                    [telegraf_1.Markup.button.callback('🔙 Back to Menu', 'back_to_menu')],
                ]).reply_markup
            });
        }
    });
    bot.action(/browse_next_(\d+)/, async (ctx) => {
        try {
            const page = parseInt(ctx.match[1], 10);
            const nextPage = page + 1;
            // Get listings for the next page
            const listings = await prisma.listing.findMany({
                orderBy: { createdAt: 'desc' },
                include: { user: true },
            });
            if (nextPage >= listings.length) {
                // Already at last page, just answer callback
                await ctx.answerCbQuery('Already at last page');
                return;
            }
            const listing = listings[nextPage];
            const photos = JSON.parse(listing.photos || '[]');
            let msg = `*${listing.title}*\n${listing.description}\n`;
            if (listing.price)
                msg += `\n💵 Price: ${listing.price}`;
            msg += `\n📍 Location: ${listing.location}`;
            if (listing.marketplaceLink)
                msg += `\n🔗 [Marketplace Link](${listing.marketplaceLink})`;
            msg += `\n📞 Contact: ${listing.user.contact}`;
            msg += `\n\n📄 Page ${nextPage + 1} of ${Math.ceil(listings.length / PAGE_SIZE)}`;
            // Update the listing content (send new message since it has photos)
            if (photos.length > 0) {
                const mediaGroup = photos.map((fileId, i) => ({
                    type: 'photo', media: fileId,
                    ...(i === 0 ? { caption: msg, parse_mode: 'Markdown' } : {})
                }));
                await ctx.replyWithMediaGroup(mediaGroup);
            }
            else {
                await ctx.reply(msg, { parse_mode: 'Markdown' });
            }
            // Update the navigation message with new buttons
            const buttons = [];
            if (nextPage > 0)
                buttons.push(telegraf_1.Markup.button.callback('⬅️ Previous', `browse_prev_${nextPage}`));
            if (nextPage < listings.length - 1)
                buttons.push(telegraf_1.Markup.button.callback('Next ➡️', `browse_next_${nextPage}`));
            const actionButtons = [];
            if (buttons.length > 0)
                actionButtons.push(buttons);
            actionButtons.push([telegraf_1.Markup.button.callback('🔙 Back to Menu', 'back_to_menu')]);
            const replyMarkup = telegraf_1.Markup.inlineKeyboard(actionButtons).reply_markup;
            // Edit the existing navigation message
            if (ctx.session && ctx.session.navigationMessageId) {
                try {
                    await ctx.telegram.editMessageText(ctx.chat.id, ctx.session.navigationMessageId, undefined, 'Navigation:', { reply_markup: replyMarkup });
                }
                catch (error) {
                    if (error.description?.includes('message is not modified')) {
                        console.log('Navigation message unchanged, skipping edit');
                    }
                    else {
                        console.error('Error editing navigation message:', error);
                        // Fallback: send new navigation message
                        const navigationMessage = await ctx.reply('Navigation:', { reply_markup: replyMarkup });
                        ctx.session.navigationMessageId = navigationMessage.message_id;
                    }
                }
            }
            await ctx.answerCbQuery();
        }
        catch (error) {
            console.error('Error in browse_next action:', error);
            await ctx.answerCbQuery('Error loading next page');
        }
    });
    bot.action(/browse_prev_(\d+)/, async (ctx) => {
        try {
            const page = parseInt(ctx.match[1], 10);
            const prevPage = Math.max(0, page - 1);
            // Get listings for the previous page
            const listings = await prisma.listing.findMany({
                orderBy: { createdAt: 'desc' },
                include: { user: true },
            });
            const listing = listings[prevPage];
            const photos = JSON.parse(listing.photos || '[]');
            let msg = `*${listing.title}*\n${listing.description}\n`;
            if (listing.price)
                msg += `\n💵 Price: ${listing.price}`;
            msg += `\n📍 Location: ${listing.location}`;
            if (listing.marketplaceLink)
                msg += `\n🔗 [Marketplace Link](${listing.marketplaceLink})`;
            msg += `\n📞 Contact: ${listing.user.contact}`;
            msg += `\n\n📄 Page ${prevPage + 1} of ${Math.ceil(listings.length / PAGE_SIZE)}`;
            // Update the listing content (send new message since it has photos)
            if (photos.length > 0) {
                const mediaGroup = photos.map((fileId, i) => ({
                    type: 'photo', media: fileId,
                    ...(i === 0 ? { caption: msg, parse_mode: 'Markdown' } : {})
                }));
                await ctx.replyWithMediaGroup(mediaGroup);
            }
            else {
                await ctx.reply(msg, { parse_mode: 'Markdown' });
            }
            // Update the navigation message with new buttons
            const buttons = [];
            if (prevPage > 0)
                buttons.push(telegraf_1.Markup.button.callback('⬅️ Previous', `browse_prev_${prevPage}`));
            if (prevPage < listings.length - 1)
                buttons.push(telegraf_1.Markup.button.callback('Next ➡️', `browse_next_${prevPage}`));
            const actionButtons = [];
            if (buttons.length > 0)
                actionButtons.push(buttons);
            actionButtons.push([telegraf_1.Markup.button.callback('🔙 Back to Menu', 'back_to_menu')]);
            const replyMarkup = telegraf_1.Markup.inlineKeyboard(actionButtons).reply_markup;
            // Edit the existing navigation message
            if (ctx.session && ctx.session.navigationMessageId) {
                try {
                    await ctx.telegram.editMessageText(ctx.chat.id, ctx.session.navigationMessageId, undefined, 'Navigation:', { reply_markup: replyMarkup });
                }
                catch (error) {
                    if (error.description?.includes('message is not modified')) {
                        console.log('Navigation message unchanged, skipping edit');
                    }
                    else {
                        console.error('Error editing navigation message:', error);
                        // Fallback: send new navigation message
                        const navigationMessage = await ctx.reply('Navigation:', { reply_markup: replyMarkup });
                        ctx.session.navigationMessageId = navigationMessage.message_id;
                    }
                }
            }
            await ctx.answerCbQuery();
        }
        catch (error) {
            console.error('Error in browse_prev action:', error);
            await ctx.answerCbQuery('Error loading previous page');
        }
    });
}
