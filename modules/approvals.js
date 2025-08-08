const { templates } = require('../ui/templates');
const { keyboards } = require('../ui/keyboards');
const config = require('../config');
const { utils } = require('../utils');

const approvals = {
    // Handle admin actions
    async handleAdminAction(ctx) {
        const action = ctx.match[1]; // Everything after "admin."
        const [actionType, ...params] = action.split('.');

        switch (actionType) {
            case 'open':
                return approvals.showAdminMenu(ctx);
            case 'approvals':
                const page = params[0]?.split(':')[1] || '1';
                return approvals.showApprovals(ctx, parseInt(page));
            case 'approve':
                return approvals.approveRequest(ctx, params);
            case 'reject':
                return approvals.rejectRequest(ctx, params);
            case 'broadcast':
                return approvals.handleBroadcast(ctx, params);
            case 'requests':
                const requestPage = params[0]?.split(':')[1] || '1';
                return approvals.showRequests(ctx, parseInt(requestPage));
            case 'logs':
                const logPage = params[0]?.split(':')[1] || '1';
                return approvals.showAuditLog(ctx, parseInt(logPage));
            default:
                return ctx.answerCbQuery('⚠️ Admin action not found');
        }
    },

    // Show admin menu
    async showAdminMenu(ctx) {
        const pendingCount = Array.from(config.mockData.pendingApprovals.values())
            .filter(approval => approval.status === 'pending').length;

        const menuText = `🛡️ <b>Admin Panel</b>

Welcome to the administration interface.

📊 <b>System Status:</b>
• 🗂️ Pending Approvals: <b>${pendingCount}</b>
• 👥 Total Users: <b>${config.mockData.users.size}</b>
• 🏪 Total Listings: <b>${config.mockData.listings.size}</b>

<i>Select an option below:</i>`;

        if (ctx.callbackQuery) {
            return ctx.editMessageText(menuText, {
                parse_mode: 'HTML',
                reply_markup: keyboards.adminMenu()
            });
        } else {
            return ctx.replyWithHTML(menuText, {
                reply_markup: keyboards.adminMenu()
            });
        }
    },

    // Show pending approvals
    async showApprovals(ctx, page = 1) {
        const pendingApprovals = Array.from(config.mockData.pendingApprovals.values())
            .filter(approval => approval.status === 'pending')
            .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

        const itemsPerPage = 5;
        const totalPages = Math.ceil(pendingApprovals.length / itemsPerPage);
        const startIndex = (page - 1) * itemsPerPage;
        const endIndex = startIndex + itemsPerPage;
        const pageItems = pendingApprovals.slice(startIndex, endIndex);

        let text = `🗂️ <b>Pending Approvals</b> (Page ${page}/${totalPages})\n\n`;

        if (pageItems.length === 0) {
            text += '✅ <i>No pending approvals</i>';
        } else {
            pageItems.forEach((approval, index) => {
                text += `<b>${startIndex + index + 1}.</b> `;

                if (approval.type === 'role') {
                    text += `👤 <b>Role Request</b>\n`;
                    text += `User: ${utils.getUserDisplayName(approval.userData)}\n`;
                    text += `Role: <b>${approval.requestedRole}</b>\n`;
                } else if (approval.type === 'profile') {
                    text += `👤 <b>Profile Change</b>\n`;
                    text += `User: ${utils.getUserDisplayName(approval.userData)}\n`;
                    text += `Field: <b>${approval.field}</b>\n`;
                    text += `New Value: <b>${approval.newValue}</b>\n`;
                }

                text += `Date: ${utils.formatDate(approval.createdAt)}\n`;
                text += `ID: <code>${approval.id}</code>\n\n`;
            });
        }

        // Build keyboard
        const keyboard = [];

        // Individual approval buttons
        pageItems.forEach((approval, index) => {
            keyboard.push([
                { text: `✅ Approve #${startIndex + index + 1}`, callback_data: `admin.approve:${approval.type}:${approval.id}` },
                { text: `❌ Reject #${startIndex + index + 1}`, callback_data: `admin.reject:${approval.type}:${approval.id}` }
            ]);
        });

        // Pagination
        if (totalPages > 1) {
            keyboard.push(...keyboards.pagination(page, totalPages, 'admin.approvals.page'));
        }

        // Back button
        keyboard.push([{ text: '⬅️ Back to Admin', callback_data: 'admin.open' }]);

        return ctx.editMessageText(text, {
            parse_mode: 'HTML',
            reply_markup: { inline_keyboard: keyboard }
        });
    },

    // Approve request
    async approveRequest(ctx, params) {
        const [, type, approvalId] = params[0].split(':');
        const approval = config.mockData.pendingApprovals.get(approvalId);

        if (!approval || approval.status !== 'pending') {
            return ctx.answerCbQuery('⚠️ Approval request not found or already processed');
        }

        // Update approval status
        approval.status = 'approved';
        approval.approvedBy = ctx.from.id;
        approval.approvedAt = new Date();

        if (type === 'role') {
            // Approve role request
            const userData = config.mockData.users.get(approval.userId);
            if (userData) {
                userData.approved = true;
                userData.approvedAt = new Date();
                userData.approvedBy = ctx.from.id;
                config.mockData.users.set(approval.userId, userData);

                // Notify user of approval
                try {
                    await ctx.telegram.sendMessage(
                        approval.userId,
                        templates.approvalGranted(approval.requestedRole),
                        {
                            parse_mode: 'HTML',
                            reply_markup: keyboards.backButton('user.profile.setup')
                        }
                    );
                } catch (error) {
                    console.warn('Failed to notify user of approval:', error.description);
                }
            }
        } else if (type === 'profile') {
            // Approve profile change
            const userData = config.mockData.users.get(approval.userId);
            if (userData) {
                userData.profile[approval.field] = approval.newValue;
                userData.trustScore = utils.calculateTrustScore(userData.profile);
                config.mockData.users.set(approval.userId, userData);

                // Notify user of approval
                try {
                    await ctx.telegram.sendMessage(
                        approval.userId,
                        templates.success(`Your ${approval.field} change has been approved!`),
                        { parse_mode: 'HTML' }
                    );
                } catch (error) {
                    console.warn('Failed to notify user of profile approval:', error.description);
                }
            }
        }

        // Update the message to show approval
        await ctx.editMessageText(
            `✅ <b>Approved!</b>\n\n` +
            `Request ID: <code>${approvalId}</code>\n` +
            `Approved by: ${utils.getUserDisplayName(ctx.from)}\n` +
            `Date: ${utils.formatDate()}`,
            { parse_mode: 'HTML' }
        );

        return ctx.answerCbQuery('✅ Request approved successfully!');
    },

    // Reject request
    async rejectRequest(ctx, params) {
        const [, type, approvalId] = params[0].split(':');
        const approval = config.mockData.pendingApprovals.get(approvalId);

        if (!approval || approval.status !== 'pending') {
            return ctx.answerCbQuery('⚠️ Approval request not found or already processed');
        }

        // For now, we'll reject with a generic reason
        // In a full implementation, you'd have a reason selection flow
        const rejectionReason = 'Request does not meet our guidelines';

        // Update approval status
        approval.status = 'rejected';
        approval.rejectedBy = ctx.from.id;
        approval.rejectedAt = new Date();
        approval.rejectionReason = rejectionReason;

        if (type === 'role') {
            // Remove user data for role rejection
            config.mockData.users.delete(approval.userId);

            // Notify user of rejection
            try {
                await ctx.telegram.sendMessage(
                    approval.userId,
                    templates.blocked(`Your role request was rejected.\n\nReason: ${rejectionReason}`),
                    {
                        parse_mode: 'HTML',
                        reply_markup: keyboards.backButton('user.role.reselect')
                    }
                );
            } catch (error) {
                console.warn('Failed to notify user of rejection:', error.description);
            }
        } else if (type === 'profile') {
            // Notify user of profile change rejection
            try {
                await ctx.telegram.sendMessage(
                    approval.userId,
                    templates.warning(`Your ${approval.field} change was rejected.\n\nReason: ${rejectionReason}`),
                    { parse_mode: 'HTML' }
                );
            } catch (error) {
                console.warn('Failed to notify user of profile rejection:', error.description);
            }
        }

        // Update the message to show rejection
        await ctx.editMessageText(
            `❌ <b>Rejected</b>\n\n` +
            `Request ID: <code>${approvalId}</code>\n` +
            `Rejected by: ${utils.getUserDisplayName(ctx.from)}\n` +
            `Reason: ${rejectionReason}\n` +
            `Date: ${utils.formatDate()}`,
            { parse_mode: 'HTML' }
        );

        return ctx.answerCbQuery('❌ Request rejected');
    },

    // Handle broadcast functionality
    async handleBroadcast(ctx, params) {
        const action = params[0];

        if (action === 'start') {
            return ctx.editMessageText(
                '📢 <b>Broadcast Message</b>\n\n' +
                'This feature allows you to send messages to all users.\n\n' +
                '<i>For this demo, broadcast functionality is simplified.</i>',
                {
                    parse_mode: 'HTML',
                    reply_markup: keyboards.backButton('admin.open')
                }
            );
        }

        return ctx.answerCbQuery('⚠️ Broadcast action not implemented');
    },

    // Show user requests/reports
    async showRequests(ctx, page = 1) {
        const requestsText = `📋 <b>User Requests & Reports</b> (Page ${page}/1)\n\n` +
                           '✅ <i>No pending requests at this time</i>\n\n' +
                           '<i>User reports and listing moderation requests would appear here.</i>';

        return ctx.editMessageText(requestsText, {
            parse_mode: 'HTML',
            reply_markup: keyboards.backButton('admin.open')
        });
    },

    // Show audit log
    async showAuditLog(ctx, page = 1) {
        const approvals = Array.from(config.mockData.pendingApprovals.values())
            .filter(approval => approval.status !== 'pending')
            .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
            .slice(0, 10); // Last 10 entries

        let logText = `🛡️ <b>Audit Log</b> (Recent Activity)\n\n`;

        if (approvals.length === 0) {
            logText += '📝 <i>No audit entries</i>';
        } else {
            approvals.forEach((entry, index) => {
                const status = entry.status === 'approved' ? '✅' : '❌';
                logText += `${status} <b>${entry.type}</b> - ${utils.getUserDisplayName(entry.userData)}\n`;
                logText += `📅 ${utils.formatDate(entry.createdAt)}\n\n`;
            });
        }

        return ctx.editMessageText(logText, {
            parse_mode: 'HTML',
            reply_markup: keyboards.backButton('admin.open')
        });
    }
};

module.exports = { approvals };
