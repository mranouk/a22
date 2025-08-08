const { Composer } = require('telegraf');
const { onboarding } = require('../modules/onboarding');
const { approvals } = require('../modules/approvals');
const { profile } = require('../modules/profile');
const { marketplace } = require('../modules/marketplace');
const { wallet } = require('../modules/wallet');
const { referrals } = require('../modules/referrals');
const { boosts } = require('../modules/boosts');
const { premium } = require('../modules/premium');
const { trust } = require('../modules/trust');
const { missions } = require('../modules/missions');
const { notifications } = require('../modules/notifications');
const { support } = require('../modules/support');

const router = new Composer();

// Start command and onboarding flow
router.command('start', onboarding.start);
router.command('admin', (ctx) => {
    if (ctx.isAdmin) {
        return ctx.scene.enter('admin_menu');
    }
    return ctx.replyWithHTML('🚫 <b>Not allowed:</b> Admin access required');
});

// User namespace handlers
router.action(/^user\.(.+)/, (ctx) => {
    const [, action] = ctx.match;

    // Route to appropriate module based on action
    if (action.startsWith('role.')) {
        return onboarding.handleRoleSelection(ctx);
    }
    if (action.startsWith('profile.')) {
        return profile.handleAction(ctx);
    }
    if (action === 'home') {
        return onboarding.showMainMenu(ctx);
    }

    return ctx.answerCbQuery('⚠️ Action not found');
});

// Market namespace handlers
router.action(/^market\.(.+)/, marketplace.handleAction);

// Wallet namespace handlers  
router.action(/^wallet\.(.+)/, wallet.handleAction);

// Escrow namespace handlers
router.action(/^escrow\.(.+)/, wallet.handleEscrowAction);

// Referrals namespace handlers
router.action(/^referrals\.(.+)/, referrals.handleAction);

// Boosts namespace handlers
router.action(/^boosts\.(.+)/, boosts.handleAction);

// Premium namespace handlers
router.action(/^premium\.(.+)/, premium.handleAction);

// Trust namespace handlers
router.action(/^trust\.(.+)/, trust.handleAction);

// Missions namespace handlers
router.action(/^missions\.(.+)/, missions.handleAction);

// Notifications namespace handlers
router.action(/^notifications\.(.+)/, notifications.handleAction);

// Support namespace handlers
router.action(/^support\.(.+)/, support.handleAction);

// Admin namespace handlers
router.action(/^admin\.(.+)/, (ctx) => {
    if (!ctx.isAdmin) {
        return ctx.answerCbQuery('🚫 Not allowed: Admin access required', { show_alert: true });
    }
    return approvals.handleAdminAction(ctx);
});

// Profile form handlers (text input)
router.on('text', (ctx) => {
    if (ctx.session?.user?.currentWizardStep) {
        return profile.handleTextInput(ctx);
    }

    // Default response for unexpected text
    return ctx.replyWithHTML(
        'ℹ️ <b>Info:</b> Use the menu buttons to navigate.',
        { reply_markup: { remove_keyboard: true } }
    );
});

// Pre-checkout query handler (for Telegram Stars payments)
router.on('pre_checkout_query', async (ctx) => {
    try {
        // Always approve for Stars payments (XTR)
        await ctx.answerPreCheckoutQuery(true);
    } catch (error) {
        console.error('Pre-checkout error:', error);
        await ctx.answerPreCheckoutQuery(false, 'Payment processing error');
    }
});

// Successful payment handler
router.on('successful_payment', async (ctx) => {
    try {
        const payment = ctx.message.successful_payment;

        // Handle different payment types based on payload
        const payload = JSON.parse(payment.invoice_payload || '{}');

        switch (payload.type) {
            case 'boost':
                return boosts.handleSuccessfulPayment(ctx, payment, payload);
            case 'premium':
                return premium.handleSuccessfulPayment(ctx, payment, payload);
            case 'escrow':
                return wallet.handleSuccessfulEscrowPayment(ctx, payment, payload);
            default:
                return ctx.replyWithHTML(
                    templates.paymentSuccess(payment.total_amount / 100) // Convert from smallest units
                );
        }
    } catch (error) {
        console.error('Payment success error:', error);
        return ctx.replyWithHTML('⚠️ <b>Error:</b> Payment processed but confirmation failed');
    }
});

// Fallback for unhandled callback queries
router.on('callback_query', (ctx) => {
    console.warn('Unhandled callback query:', ctx.callbackQuery.data);
    return ctx.answerCbQuery('⛔️ Sorry, this option is no longer available!');
});

module.exports = router;
