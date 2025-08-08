const { keyboards } = require('./keyboards');

// Global stale button fallback
const staleGuard = async (ctx, next) => {
    try {
        return await next();
    } catch (error) {
        // Check if it's a callback query with invalid data
        if (ctx.callbackQuery && error.description?.includes('query is too old')) {
            await ctx.answerCbQuery('⛔️ Sorry, this option is no longer available!', { show_alert: true });
            return ctx.editMessageText(
                '⛔️ <b>Session Expired</b>\n\nThis interface is no longer valid. Please start over.',
                {
                    parse_mode: 'HTML',
                    reply_markup: keyboards.backButton('user.home')
                }
            );
        }

        // Re-throw other errors
        throw error;
    }
};

module.exports = { staleGuard };
