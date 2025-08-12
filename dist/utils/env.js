"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BOT_TOKEN = void 0;
const dotenv_1 = require("dotenv");
(0, dotenv_1.config)();
exports.BOT_TOKEN = process.env.BOT_TOKEN;
if (!exports.BOT_TOKEN) {
    throw new Error('BOT_TOKEN is not set in .env');
}
