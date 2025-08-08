const { templates } = require('../ui/templates');
const { keyboards } = require('../ui/keyboards');
const config = require('../config');
const { utils } = require('../utils');
const { onboarding } = require('./onboarding');

const support = {
    // Handle support actions
    async handleAction(ctx) {
        const action = ctx.match[1]; // Everything after "support."
        const [actionType, ...params] = action.split('.');

        switch (actionType) {
            case 'open':
                return support.showSupport(ctx);
            case 'category':
                return support.selectCategory(ctx, params[0]);
            case 'issue':
                return support.selectIssue(ctx, params);
            case 'contact':
                return support.contactAdmin(ctx);
            default:
                return ctx.answerCbQuery('⚠️ Support action not found');
        }
    },

    // Show support center
    async showSupport(ctx) {
        const access = onboarding.checkUserAccess(ctx);
        if (!access.allowed) {
            return ctx.replyWithHTML(templates.error(access.reason));
        }

        const supportText = `🛡️ <b>Support Center</b>\n\n` +
                          `Need help? We're here to assist you!\n\n` +
                          `📋 <b>What can we help you with?</b>`;

        const keyboard = [
            [
                { text: '🏪 Marketplace Issues', callback_data: 'support.category:marketplace' },
                { text: '💸 Payment Problems', callback_data: 'support.category:payment' }
            ],
            [
                { text: '👤 Account Issues', callback_data: 'support.category:account' },
                { text: '🛡️ Trust & Safety', callback_data: 'support.category:safety' }
            ],
            [
                { text: '❓ General Questions', callback_data: 'support.category:general' },
                { text: '🐛 Report Bug', callback_data: 'support.category:bug' }
            ],
            [{ text: '⬅️ Back to Menu', callback_data: 'user.home' }]
        ];

        if (ctx.callbackQuery) {
            return ctx.editMessageText(supportText, {
                parse_mode: 'HTML',
                reply_markup: { inline_keyboard: keyboard }
            });
        } else {
            return ctx.replyWithHTML(supportText, {
                reply_markup: { inline_keyboard: keyboard }
            });
        }
    },

    // Select support category
    async selectCategory(ctx, category) {
        const categoryNames = {
            'marketplace': 'Marketplace',
            'payment': 'Payment', 
            'account': 'Account',
            'safety': 'Trust & Safety',
            'general': 'General',
            'bug': 'Bug Report'
        };

        const categoryName = categoryNames[category] || category;
        let categoryText = `🛡️ <b>${categoryName} Support</b>\n\n`;

        let keyboard = [];

        switch (category) {
            case 'marketplace':
                categoryText += `Select your marketplace issue:`;
                keyboard = [
                    [{ text: '📝 Cannot create listing', callback_data: 'support.issue:listing:create' }],
                    [{ text: '👁️ Listing not visible', callback_data: 'support.issue:listing:visibility' }],
                    [{ text: '🔍 Search not working', callback_data: 'support.issue:search:broken' }],
                    [{ text: '🚀 Boost not working', callback_data: 'support.issue:boost:failed' }]
                ];
                break;

            case 'payment':
                categoryText += `Select your payment issue:`;
                keyboard = [
                    [{ text: '💳 Payment failed', callback_data: 'support.issue:payment:failed' }],
                    [{ text: '⭐ Stars not received', callback_data: 'support.issue:stars:missing' }],
                    [{ text: '🛡️ Escrow problem', callback_data: 'support.issue:escrow:stuck' }],
                    [{ text: '↩️ Refund request', callback_data: 'support.issue:refund:request' }]
                ];
                break;

            case 'account':
                categoryText += `Select your account issue:`;
                keyboard = [
                    [{ text: '🔒 Login problems', callback_data: 'support.issue:login:failed' }],
                    [{ text: '👤 Profile issues', callback_data: 'support.issue:profile:broken' }],
                    [{ text: '⏳ Approval pending', callback_data: 'support.issue:approval:slow' }],
                    [{ text: '📊 Trust score wrong', callback_data: 'support.issue:trust:incorrect' }]
                ];
                break;

            default:
                categoryText += `This category is being processed. Please contact support directly.`;
                keyboard = [
                    [{ text: '📞 Contact Admin', callback_data: 'support.contact' }]
                ];
        }

        keyboard.push([{ text: '⬅️ Back to Support', callback_data: 'support.open' }]);

        return ctx.editMessageText(categoryText, {
            parse_mode: 'HTML',
            reply_markup: { inline_keyboard: keyboard }
        });
    },

    // Select specific issue
    async selectIssue(ctx, params) {
        const [category, issue] = params;

        // Mock solutions based on common issues
        const solutions = {
            'listing:create': {
                title: '📝 Cannot Create Listing',
                solution: `Common solutions:\n\n` +
                         `1. ✅ Ensure your profile is complete\n` +
                         `2. 📱 Try refreshing the app\n` +
                         `3. 🔄 Clear your session and restart\n` +
                         `4. 📊 Check if you have sufficient trust score\n\n` +
                         `If the problem persists, please contact support.`
            },
            'payment:failed': {
                title: '💳 Payment Failed',
                solution: `Troubleshooting steps:\n\n` +
                         `1. 💰 Check your Stars balance\n` +
                         `2. 🔄 Try the payment again\n` +
                         `3. 📱 Restart Telegram app\n` +
                         `4. 📞 Contact @PremiumBot for Stars issues\n\n` +
                         `Payments are processed by Telegram.`
            },
            'stars:missing': {
                title: '⭐ Stars Not Received',
                solution: `If your Stars are missing:\n\n` +
                         `1. ⏰ Wait 5-10 minutes for processing\n` +
                         `2. 🔄 Check your wallet history\n` +
                         `3. 📱 Restart the app\n` +
                         `4. 📞 Contact support with transaction ID\n\n` +
                         `Stars are usually instant but may take a few minutes.`
            }
        };

        const issueKey = `${category}:${issue}`;
        const solutionData = solutions[issueKey];

        let issueText = '';
        if (solutionData) {
            issueText = `🛡️ <b>${solutionData.title}</b>\n\n${solutionData.solution}`;
        } else {
            issueText = `🛡️ <b>Support Request</b>\n\n` +
                       `Issue: ${category} - ${issue}\n\n` +
                       `We've received your request. A support agent will help you shortly.`;
        }

        const keyboard = [
            [{ text: '✅ This helped', callback_data: 'support.feedback:helpful' }],
            [{ text: '📞 Still need help', callback_data: 'support.contact' }],
            [{ text: '⬅️ Back to Support', callback_data: 'support.open' }]
        ];

        return ctx.editMessageText(issueText, {
            parse_mode: 'HTML',
            reply_markup: { inline_keyboard: keyboard }
        });
    },

    // Contact admin
    async contactAdmin(ctx) {
        const userId = ctx.from.id;
        const userData = config.mockData.users.get(userId);

        const contactText = `📞 <b>Contact Support</b>\n\n` +
                          `We'll connect you with our support team.\n\n` +
                          `🆔 <b>Your User ID:</b> <code>${userId}</code>\n` +
                          `👤 <b>Name:</b> ${utils.getUserDisplayName(ctx.from)}\n` +
                          `📅 <b>Request Date:</b> ${utils.formatDate()}\n\n` +
                          `📝 <i>A support agent will contact you within 24 hours.</i>`;

        // Notify admins about support request
        for (const adminId of config.ADMIN_IDS) {
            try {
                await ctx.telegram.sendMessage(
                    adminId,
                    `📞 <b>Support Request</b>\n\n` +
                    `From: ${utils.getUserDisplayName(ctx.from)}\n` +
                    `User ID: <code>${userId}</code>\n` +
                    `Date: ${utils.formatDate()}\n\n` +
                    `Please assist this user with their request.`,
                    { parse_mode: 'HTML' }
                );
            } catch (error) {
                console.warn(`Failed to notify admin ${adminId}:`, error.description);
            }
        }

        return ctx.editMessageText(contactText, {
            parse_mode: 'HTML',
            reply_markup: keyboards.backButton('support.open')
        });
    }
};

module.exports = { support };