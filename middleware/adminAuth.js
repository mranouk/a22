const config = require('../config');

const adminAuth = (ctx, next) => {
    // Add admin flag to context
    ctx.isAdmin = config.ADMIN_IDS.includes(ctx.from?.id);

    // Admin-only callback data check
    if (ctx.callbackQuery?.data?.startsWith('admin.')) {
        if (!ctx.isAdmin) {
            return ctx.answerCbQuery('🚫 Not allowed: Admin access required', { show_alert: true });
        }
    }

    return next();
};

module.exports = { adminAuth };