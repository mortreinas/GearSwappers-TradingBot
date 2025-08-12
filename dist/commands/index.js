"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.setupCommands = setupCommands;
const start_1 = require("./start");
const add_1 = require("./add");
const mylistings_1 = require("./mylistings");
const browse_1 = require("./browse");
const listings_1 = require("./listings");
function setupCommands(bot, prisma) {
    (0, start_1.registerStartCommand)(bot, prisma);
    (0, add_1.registerAddListingCommand)(bot, prisma);
    (0, mylistings_1.registerMyListingsCommand)(bot, prisma);
    (0, browse_1.registerBrowseListingsCommand)(bot, prisma);
    (0, listings_1.registerGroupListingsCommand)(bot, prisma);
}
