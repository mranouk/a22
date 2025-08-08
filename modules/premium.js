const { templates } = require('../ui/templates');
const { keyboards } = require('../ui/keyboards');
const config = require('../config');
const { utils } = require('../utils');
const { onboarding } = require('./onboarding');

const premium = {
    // Handle premium actions
    async handleAction(ctx) {
        const action = ctx.match[1]; // Everything after "premium."
        const [actionType, ...params] = action.split('.');

        switch (actionType) {
            case 'open':
                return premium.showPremium(ctx);
            case 'select':
                return premium.selectPlan(ctx, params);
            case 'confirm':
                return premium.confirmPlan(ctx, params);
            default:
                return ctx.answerCbQuery('⚠️ Premium action not found');
        }
    },

    // Show premium plans
    async showPremium(ctx) {
        const access = onboarding.checkUserAccess(ctx);
        if (!access.allowed) {
            return ctx.replyWithHTML(templates.error(access.reason));
        }

        const userId = ctx.from.id;
        const userData = config.mockData.users.get(userId);
        const isPremium = userData.premiumUntil && new Date(userData.premiumUntil) > new Date();

        let premiumText = `💎 <b>Premium Membership</b>\n\n`;

        if (isPremium) {
            premiumText += `✅ <b>You have Premium!</b>\n`;
            premiumText += `Expires: ${utils.formatDate(userData.premiumUntil)}\n\n`;
        }

        premiumText += `🌟 <b>Premium Benefits:</b>\n`;
        premiumText += `• 🚀 Unlimited boosts\n`;
        premiumText += `• 📊 Advanced analytics\n`;
        premiumText += `• 💎 Premium badge\n`;
        premiumText += `• 🎯 Priority support\n`;
        premiumText += `• 📈 Enhanced visibility\n\n`;
        premiumText += `<i>Unlock all features with Premium!</i>`;

        const keyboard = isPremium ? [
            [{ text: '⬅️ Back to Menu', callback_data: 'user.home' }]
        ] : [
            [{ text: '💎 Monthly (50 Stars)', callback_data: 'premium.select:monthly:50' }],
            [{ text: '💎 Yearly (500 Stars)', callback_data: 'premium.select:yearly:500' }],
            [{ text: '⬅️ Back to Menu', callback_data: 'user.home' }]
        ];

        if (ctx.callbackQuery) {
            return ctx.editMessageText(premiumText, {
                parse_mode: 'HTML',
                reply_markup: { inline_keyboard: keyboard }
            });
        } else {
            return ctx.replyWithHTML(premiumText, {
                reply_markup: { inline_keyboard: keyboard }
            });
        }
    },

    // Select premium plan
    async selectPlan(ctx, params) {
        const [planData] = params;
        const [plan, price] = planData.split(':');

        const confirmText = `💎 <b>Confirm Premium Purchase</b>\n\n` +
                          `Plan: <b>${plan === 'monthly' ? 'Monthly' : 'Yearly'}</b>\n` +
                          `Price: <b>${utils.formatStars(price)}</b>\n\n` +
                          `Ready to upgrade?`;

        const keyboard = [
            [{ text: '✅ Purchase Premium', callback_data: `premium.confirm:${plan}:${price}` }],
            [{ text: '⬅️ Back', callback_data: 'premium.open' }]
        ];

        return ctx.editMessageText(confirmText, {
            parse_mode: 'HTML',
            reply_markup: { inline_keyboard: keyboard }
        });
    },

    // Confirm and create invoice
    async confirmPlan(ctx, params) {
        const [plan, price] = params;

        try {
            const invoicePayload = JSON.stringify({
                type: 'premium',
                plan: plan,
                userId: ctx.from.id
            });

            await ctx.replyWithInvoice({
                title: `Premium ${plan === 'monthly' ? 'Monthly' : 'Yearly'}`,
                description: `Upgrade to Premium and unlock all features`,
                payload: invoicePayload,
                provider_token: '',
                currency: 'XTR',
                prices: [{ label: 'Premium', amount: parseInt(price) }],
                photo_url: 'https://via.placeholder.com/512x512/FFD700/FFFFFF?text=💎',
                photo_width: 512,
                photo_height: 512
            });

            await ctx.answerCbQuery('💎 Premium invoice created!');

        } catch (error) {
            console.error('Premium invoice error:', error);
            return ctx.answerCbQuery('⚠️ Failed to create premium invoice', { show_alert: true });
        }
    },

    // Handle successful payment
    async handleSuccessfulPayment(ctx, payment, payload) {
        const userId = ctx.from.id;
        const userData = config.mockData.users.get(userId);

        if (userData) {
            const duration = payload.plan === 'monthly' ? 30 : 365;
            const expiryDate = new Date();
            expiryDate.setDate(expiryDate.getDate() + duration);

            userData.premiumUntil = expiryDate;
            userData.isPremium = true;
            config.mockData.users.set(userId, userData);
        }

        return ctx.replyWithHTML(
            templates.completed(`Premium activated! Welcome to Premium membership.\n\nExpires: ${utils.formatDate(userData.premiumUntil)}`),
            {
                reply_markup: keyboards.backButton('user.home')
            }
        );
    }
};

module.exports = { premium };