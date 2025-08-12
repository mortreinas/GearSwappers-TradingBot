"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.handleAddListing = handleAddListing;
exports.registerAddListingCommand = registerAddListingCommand;
async function handleAddListing(ctx) {
    if (ctx.chat?.type !== 'private')
        return;
    await ctx.scene.enter('add-listing-wizard');
}
function registerAddListingCommand(bot, prisma) {
    bot.command('add', handleAddListing);
}
