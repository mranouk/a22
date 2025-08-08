const { templates } = require('../ui/templates');
const { keyboards } = require('../ui/keyboards');
const config = require('../config');
const { utils } = require('../utils');
const { onboarding } = require('./onboarding');

const notifications = {
    // Handle notification actions
    async handleAction(ctx) {
        const action = ctx.match[1]; // Everything after "notifications."
        const [actionType, ...params] = action.split('.');

        switch (actionType) {
            case 'open':
                return notifications.showNotifications(ctx);
            case 'toggle':
                return notifications.toggleCategory(ctx, params[0]);
            case 'page':
                return notifications.showNotifications(ctx, parseInt(params[0].split(':')[1]));
            default:
                return ctx.answerCbQuery('⚠️ Notification action not found');
        }
    },

    // Show notifications center
    async showNotifications(ctx, page = 1) {
        const access = onboarding.checkUserAccess(ctx);
        if (!access.allowed) {
            return ctx.replyWithHTML(templates.error(access.reason));
        }

        const userId = ctx.from.id;
        const userData = config.mockData.users.get(userId);

        // Mock notification settings
        const settings = userData.notificationSettings || {
            marketplace: true,
            wallet: true,
            approvals: true,
            broadcasts: true
        };

        // Mock recent notifications
        const mockNotifications = [
            {
                id: 'notif_1',
                category: 'marketplace',
                title: '🏪 New listing in your sector',
                message: 'A new Technology listing has been posted',
                date: new Date('2024-01-15T10:30:00'),
                read: false
            },
            {
                id: 'notif_2',
                category: 'wallet',
                title: '💰 Payment received',
                message: 'You received 50 Stars for your service',
                date: new Date('2024-01-14T15:45:00'),
                read: true
            },
            {
                id: 'notif_3',
                category: 'broadcasts',
                title: '📢 System update',
                message: 'New features have been added to the marketplace',
                date: new Date('2024-01-13T09:20:00'),
                read: true
            }
        ];

        let notifText = `📲 <b>Notifications Center</b>\n\n`;

        notifText += `🔔 <b>Notification Settings:</b>\n`;
        notifText += `🏪 Marketplace: ${settings.marketplace ? '🔔' : '🔕'}\n`;
        notifText += `💸 Wallet: ${settings.wallet ? '🔔' : '🔕'}\n`;
        notifText += `🗂️ Approvals: ${settings.approvals ? '🔔' : '🔕'}\n`;
        notifText += `📢 Broadcasts: ${settings.broadcasts ? '🔔' : '🔕'}\n\n`;

        notifText += `📋 <b>Recent Notifications:</b>\n\n`;

        const itemsPerPage = 3;
        const startIndex = (page - 1) * itemsPerPage;
        const pageNotifications = mockNotifications.slice(startIndex, startIndex + itemsPerPage);

        if (pageNotifications.length === 0) {
            notifText += '📭 <i>No notifications</i>';
        } else {
            pageNotifications.forEach(notif => {
                const readIcon = notif.read ? '📖' : '📬';
                notifText += `${readIcon} <b>${notif.title}</b>\n`;
                notifText += `${notif.message}\n`;
                notifText += `📅 ${utils.formatDate(notif.date)}\n\n`;
            });
        }

        // Build keyboard
        const keyboard = [
            [
                { text: `🏪 ${settings.marketplace ? '🔕' : '🔔'}`, callback_data: 'notifications.toggle:marketplace' },
                { text: `💸 ${settings.wallet ? '🔕' : '🔔'}`, callback_data: 'notifications.toggle:wallet' }
            ],
            [
                { text: `🗂️ ${settings.approvals ? '🔕' : '🔔'}`, callback_data: 'notifications.toggle:approvals' },
                { text: `📢 ${settings.broadcasts ? '🔕' : '🔔'}`, callback_data: 'notifications.toggle:broadcasts' }
            ]
        ];

        // Pagination if needed
        const totalPages = Math.ceil(mockNotifications.length / itemsPerPage);
        if (totalPages > 1) {
            keyboard.push(...keyboards.pagination(page, totalPages, 'notifications.page'));
        }

        keyboard.push([{ text: '⬅️ Back to Menu', callback_data: 'user.home' }]);

        if (ctx.callbackQuery) {
            return ctx.editMessageText(notifText, {
                parse_mode: 'HTML',
                reply_markup: { inline_keyboard: keyboard }
            });
        } else {
            return ctx.replyWithHTML(notifText, {
                reply_markup: { inline_keyboard: keyboard }
            });
        }
    },

    // Toggle notification category
    async toggleCategory(ctx, category) {
        const userId = ctx.from.id;
        const userData = config.mockData.users.get(userId);

        if (!userData.notificationSettings) {
            userData.notificationSettings = {
                marketplace: true,
                wallet: true,
                approvals: true,
                broadcasts: true
            };
        }

        const currentState = userData.notificationSettings[category];
        userData.notificationSettings[category] = !currentState;

        config.mockData.users.set(userId, userData);

        const newState = userData.notificationSettings[category];
        await ctx.answerCbQuery(`${category} notifications ${newState ? 'enabled' : 'disabled'}`);

        return notifications.showNotifications(ctx);
    }
};

module.exports = { notifications };