const { templates } = require('../ui/templates');
const { keyboards } = require('../ui/keyboards');
const config = require('../config');
const { utils } = require('../utils');
const { onboarding } = require('./onboarding');

const trust = {
    // Handle trust actions
    async handleAction(ctx) {
        const action = ctx.match[1]; // Everything after "trust."

        switch (action) {
            case 'open':
                return trust.showTrustScore(ctx);
            default:
                return ctx.answerCbQuery('⚠️ Trust action not found');
        }
    },

    // Show trust score details
    async showTrustScore(ctx) {
        const access = onboarding.checkUserAccess(ctx);
        if (!access.allowed) {
            return ctx.replyWithHTML(templates.error(access.reason));
        }

        const userId = ctx.from.id;
        const userData = config.mockData.users.get(userId);

        const trustScore = userData.trustScore || 0;
        const trustBadge = utils.getTrustBadge(trustScore);

        // Mock trust factors
        const factors = {
            profileComplete: userData.profileCompleted ? 40 : 0,
            verifiedIdentity: 0, // Not implemented in demo
            completedDeals: 15, // Mock data
            positiveReviews: 20, // Mock data
            disputesPenalty: 0
        };

        let trustText = `📊 <b>Your Trust Score</b>\n\n`;
        trustText += `${trustBadge} <b>${trustScore}/100</b>\n\n`;

        trustText += `📋 <b>Score Breakdown:</b>\n`;
        trustText += `✅ Profile Complete: +${factors.profileComplete} points\n`;
        trustText += `🤝 Completed Deals: +${factors.completedDeals} points\n`;
        trustText += `⭐ Positive Reviews: +${factors.positiveReviews} points\n`;
        trustText += `📱 Verified Identity: +${factors.verifiedIdentity} points\n`;

        if (factors.disputesPenalty > 0) {
            trustText += `⚠️ Disputes Penalty: -${factors.disputesPenalty} points\n`;
        }

        trustText += `\n💡 <b>How to improve:</b>\n`;

        if (!userData.profileCompleted) {
            trustText += `• Complete your profile (+40 points)\n`;
        }

        trustText += `• Complete more deals successfully\n`;
        trustText += `• Get positive reviews from clients\n`;
        trustText += `• Avoid disputes and issues\n`;
        trustText += `• Verify your identity (coming soon)`;

        const keyboard = [
            [{ text: 'ℹ️ How Trust Works', callback_data: 'trust.info' }],
            [{ text: '⬅️ Back to Menu', callback_data: 'user.home' }]
        ];

        if (ctx.callbackQuery) {
            return ctx.editMessageText(trustText, {
                parse_mode: 'HTML',
                reply_markup: { inline_keyboard: keyboard }
            });
        } else {
            return ctx.replyWithHTML(trustText, {
                reply_markup: { inline_keyboard: keyboard }
            });
        }
    }
};

module.exports = { trust };