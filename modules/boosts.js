const { templates } = require('../ui/templates');
const { keyboards } = require('../ui/keyboards');
const config = require('../config');
const { utils } = require('../utils');
const { onboarding } = require('./onboarding');

const boosts = {
    // Handle boost actions
    async handleAction(ctx) {
        const action = ctx.match[1]; // Everything after "boosts."
        const [actionType, ...params] = action.split('.');

        switch (actionType) {
            case 'open':
                return boosts.showBoosts(ctx);
            case 'create':
            case 'select':
                return boosts.selectBoostType(ctx, params);
            case 'tier':
                return boosts.selectBoostTier(ctx, params);
            case 'confirm':
                return boosts.confirmBoost(ctx, params);
            default:
                return ctx.answerCbQuery('⚠️ Boost action not found');
        }
    },

    // Show boost options
    async showBoosts(ctx) {
        const access = onboarding.checkUserAccess(ctx);
        if (!access.allowed) {
            return ctx.replyWithHTML(templates.error(access.reason));
        }

        const boostText = `🚀 <b>Boost Your Presence</b>\n\n` +
                         `Increase visibility and get more engagement!\n\n` +
                         `📈 <b>Boost Options:</b>\n` +
                         `• Profile Boost - Appear in suggested users\n` +
                         `• Listing Boost - Priority in marketplace\n\n` +
                         `💡 <i>All boosts are paid with Telegram Stars</i>`;

        const keyboard = [
            [
                { text: '👤 Boost Profile', callback_data: 'boosts.create:profile' },
                { text: '🏪 Boost Listing', callback_data: 'boosts.create:listing' }
            ],
            [{ text: '⬅️ Back to Menu', callback_data: 'user.home' }]
        ];

        if (ctx.callbackQuery) {
            return ctx.editMessageText(boostText, {
                parse_mode: 'HTML',
                reply_markup: { inline_keyboard: keyboard }
            });
        } else {
            return ctx.replyWithHTML(boostText, {
                reply_markup: { inline_keyboard: keyboard }
            });
        }
    },

    // Select boost type
    async selectBoostType(ctx, params) {
        const boostType = params[0].split(':')[1];

        ctx.session.user.boostWizard = {
            type: boostType,
            step: 'tier'
        };

        return boosts.selectBoostTier(ctx, []);
    },

    // Select boost tier
    async selectBoostTier(ctx, params) {
        const boostType = ctx.session.user.boostWizard?.type || 'profile';

        let tierText = `🚀 <b>Select Boost Duration</b>\n\n`;
        tierText += `Boosting: <b>${boostType === 'profile' ? 'Your Profile' : 'Marketplace Listing'}</b>\n\n`;
        tierText += `Choose your boost duration:`;

        const keyboard = [
            [
                { text: '⭐ 3 Days (10 Stars)', callback_data: 'boosts.confirm:3d:10' },
                { text: '⭐ 7 Days (20 Stars)', callback_data: 'boosts.confirm:7d:20' }
            ],
            [
                { text: '⭐ 14 Days (35 Stars)', callback_data: 'boosts.confirm:14d:35' },
                { text: '⭐ 30 Days (60 Stars)', callback_data: 'boosts.confirm:30d:60' }
            ],
            [{ text: '⬅️ Back', callback_data: 'boosts.open' }]
        ];

        return ctx.editMessageText(tierText, {
            parse_mode: 'HTML',
            reply_markup: { inline_keyboard: keyboard }
        });
    },

    // Confirm boost and create invoice
    async confirmBoost(ctx, params) {
        const [duration, price] = params;
        const boostType = ctx.session.user.boostWizard?.type || 'profile';

        try {
            const invoicePayload = JSON.stringify({
                type: 'boost',
                boostType: boostType,
                duration: duration,
                userId: ctx.from.id
            });

            await ctx.replyWithInvoice({
                title: `${boostType === 'profile' ? 'Profile' : 'Listing'} Boost - ${duration}`,
                description: `Boost your ${boostType} for ${duration} to increase visibility`,
                payload: invoicePayload,
                provider_token: '',
                currency: 'XTR',
                prices: [{ label: 'Boost', amount: parseInt(price) }],
                photo_url: 'https://via.placeholder.com/512x512/FF6B35/FFFFFF?text=🚀',
                photo_width: 512,
                photo_height: 512
            });

            await ctx.answerCbQuery('🚀 Boost invoice created!');

        } catch (error) {
            console.error('Boost invoice error:', error);
            return ctx.answerCbQuery('⚠️ Failed to create boost invoice', { show_alert: true });
        }
    },

    // Handle successful payment
    async handleSuccessfulPayment(ctx, payment, payload) {
        const successText = `🎉 <b>Boost Activated!</b>\n\n` +
                          `Your ${payload.boostType} is now boosted for ${payload.duration}!\n\n` +
                          `📈 <b>Benefits:</b>\n` +
                          `• Higher visibility\n` +
                          `• Priority placement\n` +
                          `• Enhanced engagement\n\n` +
                          `🔥 <i>Your boost is now active!</i>`;

        return ctx.replyWithHTML(successText, {
            reply_markup: keyboards.backButton('user.home')
        });
    }
};

module.exports = { boosts };