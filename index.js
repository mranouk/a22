const { Telegraf, session } = require('telegraf');
const config = require('./config');
const { adminAuth } = require('./middleware/adminAuth');
const router = require('./router');
const { staleGuard } = require('./ui/staleGuard');

// Initialize bot
const bot = new Telegraf(config.BOT_TOKEN);

// Global error handler
bot.catch((err, ctx) => {
    console.error('❌ Bot error:', err);
    try {
        ctx.reply(
            '⚠️ <b>Error:</b> Something went wrong. Please try again.',
            { parse_mode: 'HTML' }
        );
    } catch (e) {
        console.error('Failed to send error message:', e);
    }
});

// Session middleware (in-memory for this scope)
bot.use(session());

// Initialize session data
bot.use((ctx, next) => {
    ctx.session = ctx.session || {
        user: {
            role: null,
            approved: false,
            profile: {},
            currentWizardStep: null,
            wizardData: {}
        },
        temp: {}
    };
    return next();
});

// Set default parse mode helper
bot.use((ctx, next) => {
    ctx.replyWithHTML = (text, extra = {}) => {
        return ctx.reply(text, { parse_mode: 'HTML', ...extra });
    };
    return next();
});

// Global stale button guard
bot.use(staleGuard);

// Admin authentication middleware
bot.use(adminAuth);

// Main router
bot.use(router);

// Launch bot
bot.launch({
    allowedUpdates: ['message', 'callback_query'],
});

console.log('🚀 Bot launched successfully!');

// Enable graceful stop
process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));
