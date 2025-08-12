"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const dotenv_1 = require("dotenv");
(0, dotenv_1.config)();
const telegraf_1 = require("telegraf");
const env_1 = require("./utils/env");
const commands_1 = require("./commands");
const scenes_1 = require("./scenes");
const prisma_client_1 = require("../prisma-client");
const prisma = new prisma_client_1.PrismaClient();
prisma.$use(async (params, next) => {
    console.log(`[Prisma] ${params.model}.${params.action}`);
    return next(params);
});
if (!env_1.BOT_TOKEN) {
    throw new Error('BOT_TOKEN is required');
}
const bot = new telegraf_1.Telegraf(env_1.BOT_TOKEN);
// Middleware to inject prisma client
bot.use(async (ctx, next) => {
    ctx.prisma = prisma;
    await next();
});
bot.use((0, telegraf_1.session)());
(0, scenes_1.setupScenes)(bot, prisma);
(0, commands_1.setupCommands)(bot, prisma);
bot.launch();
process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));
