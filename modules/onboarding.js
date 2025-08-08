const { templates } = require('../ui/templates');
const { keyboards } = require('../ui/keyboards');
const config = require('../config');
const { utils } = require('../utils');

const onboarding = {
    // Handle /start command
    async start(ctx) {
        const userId = ctx.from.id;

        // Check if user already exists and is approved
        const existingUser = config.mockData.users.get(userId);
        if (existingUser && existingUser.approved) {
            return onboarding.showMainMenu(ctx);
        }

        // Check if user has pending approval
        if (existingUser && !existingUser.approved) {
            return ctx.replyWithHTML(
                templates.pendingApproval(),
                {
                    reply_markup: keyboards.backButton('user.role.reselect')
                }
            );
        }

        // New user - show welcome and role selection
        return ctx.replyWithHTML(
            templates.welcome(),
            { reply_markup: keyboards.roleSelection() }
        );
    },

    // Handle role selection
    async handleRoleSelection(ctx) {
        const action = ctx.match[1]; // e.g., "role.select:buyer"
        const [, , roleAction] = action.split('.');

        if (roleAction && roleAction.startsWith('select:')) {
            const role = roleAction.split(':')[1];
            return onboarding.submitRoleRequest(ctx, role);
        }

        if (roleAction === 'reselect') {
            return ctx.editMessageText(
                templates.welcome(),
                {
                    parse_mode: 'HTML',
                    reply_markup: keyboards.roleSelection()
                }
            );
        }

        return ctx.answerCbQuery('⚠️ Invalid role selection');
    },

    // Submit role request for approval
    async submitRoleRequest(ctx, role) {
        const userId = ctx.from.id;
        const approvalId = utils.generateId('approval');

        // Create user record
        const userData = {
            id: userId,
            username: ctx.from.username,
            firstName: ctx.from.first_name,
            lastName: ctx.from.last_name,
            role: role,
            approved: false,
            profile: {},
            createdAt: new Date(),
            trustScore: 0
        };

        config.mockData.users.set(userId, userData);

        // Create approval request
        const approvalData = {
            id: approvalId,
            type: 'role',
            userId: userId,
            userData: userData,
            requestedRole: role,
            createdAt: new Date(),
            status: 'pending'
        };

        config.mockData.pendingApprovals.set(approvalId, approvalData);

        // Update user session
        ctx.session.user = {
            ...ctx.session.user,
            role: role,
            approved: false
        };

        // Notify user
        await ctx.editMessageText(
            templates.pendingApproval(),
            {
                parse_mode: 'HTML',
                reply_markup: keyboards.backButton('user.role.reselect')
            }
        );

        // Notify all admins
        await onboarding.notifyAdmins(ctx, approvalData);

        return ctx.answerCbQuery('✅ Role request submitted!');
    },

    // Notify admins of new approval request
    async notifyAdmins(ctx, approvalData) {
        const adminMessage = `🗂️ <b>New Role Approval Request</b>

👤 <b>User:</b> ${utils.getUserDisplayName(approvalData.userData)}
🎭 <b>Requested Role:</b> ${approvalData.requestedRole}
📅 <b>Date:</b> ${utils.formatDate(approvalData.createdAt)}
🆔 <b>User ID:</b> <code>${approvalData.userId}</code>

Please review and approve or reject this request.`;

        for (const adminId of config.ADMIN_IDS) {
            try {
                await ctx.telegram.sendMessage(
                    adminId,
                    adminMessage,
                    {
                        parse_mode: 'HTML',
                        reply_markup: keyboards.approvalActions(approvalData.id, 'role')
                    }
                );
            } catch (error) {
                console.warn(`Failed to notify admin ${adminId}:`, error.description);
            }
        }
    },

    // Show main menu (after approval)
    async showMainMenu(ctx) {
        const userId = ctx.from.id;
        const userData = config.mockData.users.get(userId);

        if (!userData || !userData.approved) {
            return onboarding.start(ctx);
        }

        // Update session
        ctx.session.user = {
            ...ctx.session.user,
            role: userData.role,
            approved: true
        };

        const menuText = `${templates.mainMenu()}

👋 Welcome back, <b>${utils.getUserDisplayName(ctx.from)}</b>!
🎭 Role: <b>${userData.role}</b>
📊 Trust Score: ${utils.getTrustBadge(userData.trustScore)} (${userData.trustScore}/100)`;

        const keyboard = userData.role === 'admin' || ctx.isAdmin ? 
            [...keyboards.mainMenu().reply_markup.inline_keyboard, 
             [{ text: '🛡️ Admin Panel', callback_data: 'admin.open' }]] :
            keyboards.mainMenu().reply_markup.inline_keyboard;

        if (ctx.callbackQuery) {
            return ctx.editMessageText(menuText, {
                parse_mode: 'HTML',
                reply_markup: { inline_keyboard: keyboard }
            });
        } else {
            return ctx.replyWithHTML(menuText, {
                reply_markup: { inline_keyboard: keyboard }
            });
        }
    },

    // Check if user has access (approved and has profile)
    checkUserAccess(ctx) {
        const userId = ctx.from.id;
        const userData = config.mockData.users.get(userId);

        if (!userData) {
            return { allowed: false, reason: 'User not found. Please start with /start' };
        }

        if (!userData.approved) {
            return { allowed: false, reason: 'Account pending approval' };
        }

        // Check if profile is complete for certain actions
        const profileComplete = userData.profile.sector && 
                               userData.profile.experience && 
                               userData.profile.gender && 
                               userData.profile.age;

        return { 
            allowed: true, 
            userData, 
            profileComplete 
        };
    }
};

module.exports = { onboarding };
