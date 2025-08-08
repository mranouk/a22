const { templates } = require('../ui/templates');
const { keyboards } = require('../ui/keyboards');
const config = require('../config');
const { utils } = require('../utils');
const { onboarding } = require('./onboarding');

const referrals = {
    // Handle referral actions
    async handleAction(ctx) {
        const action = ctx.match[1]; // Everything after "referrals."
        const [actionType, ...params] = action.split('.');

        switch (actionType) {
            case 'open':
                return referrals.showReferrals(ctx);
            case 'copy':
                return referrals.copyReferralLink(ctx);
            case 'refresh':
                return referrals.refreshStats(ctx);
            default:
                return ctx.answerCbQuery('⚠️ Referral action not found');
        }
    },

    // Show referral dashboard
    async showReferrals(ctx) {
        const access = onboarding.checkUserAccess(ctx);
        if (!access.allowed) {
            return ctx.replyWithHTML(templates.error(access.reason));
        }

        const userId = ctx.from.id;
        const userData = config.mockData.users.get(userId);
        const referralCode = userData.profile.referralCode || utils.generateReferralCode(userId);

        // Mock referral stats
        const stats = {
            invites: 5,
            joins: 3,
            approved: 2,
            earned: 75
        };

        const botUsername = ctx.botInfo.username;
        const referralLink = `https://t.me/${botUsername}?start=ref_${referralCode}`;

        let referralText = `🤝 <b>Referral Program</b>\n\n`;
        referralText += `🔗 <b>Your Referral Link:</b>\n<code>${referralLink}</code>\n\n`;
        referralText += `📊 <b>Your Statistics:</b>\n`;
        referralText += `📩 Invites Sent: <b>${stats.invites}</b>\n`;
        referralText += `👥 Friends Joined: <b>${stats.joins}</b>\n`;
        referralText += `✅ Approved Users: <b>${stats.approved}</b>\n`;
        referralText += `⭐ Stars Earned: <b>${stats.earned}</b>\n\n`;
        referralText += `💡 <i>Earn 25 Stars for each approved referral!</i>`;

        const keyboard = [
            [{ text: '📋 Copy Link', callback_data: 'referrals.copy' }],
            [{ text: '🔄 Refresh Stats', callback_data: 'referrals.refresh' }],
            [{ text: '⬅️ Back to Menu', callback_data: 'user.home' }]
        ];

        if (ctx.callbackQuery) {
            return ctx.editMessageText(referralText, {
                parse_mode: 'HTML',
                reply_markup: { inline_keyboard: keyboard }
            });
        } else {
            return ctx.replyWithHTML(referralText, {
                reply_markup: { inline_keyboard: keyboard }
            });
        }
    },

    // Copy referral link
    async copyReferralLink(ctx) {
        await ctx.answerCbQuery('📋 Referral link copied! Share it with friends.');
        return referrals.showReferrals(ctx);
    },

    // Refresh stats
    async refreshStats(ctx) {
        await ctx.answerCbQuery('🔄 Statistics refreshed!');
        return referrals.showReferrals(ctx);
    }
};

module.exports = { referrals };