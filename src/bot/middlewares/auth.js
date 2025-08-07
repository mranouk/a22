const userService = require('../../services/userService');
const profileService = require('../../services/profileService');
const logger = require('../../utils/logger');
const { ROLES } = require('../../utils/constants');

const auth = {
    // Check if user exists in database
    ensureUser: () => {
        return async (ctx, next) => {
            try {
                const telegramId = ctx.from.id;
                const username = ctx.from.username || '';
                const firstName = ctx.from.first_name || '';
                const lastName = ctx.from.last_name || '';

                let user = await userService.findByTelegramId(telegramId);
                
                if (!user) {
                    // Create user if doesn't exist
                    user = await userService.create({
                        telegramId,
                        username,
                        firstName,
                        lastName,
                        status: 'new'
                    });
                    
                    logger.info(`New user created: ${telegramId}`);
                }

                // Store user in context
                ctx.user = user;
                return next();
            } catch (error) {
                logger.error('Auth middleware error', error, { telegramId: ctx.from.id });
                await ctx.reply('❌ <b>Authentication Error</b>\n\nPlease try again later.', {
                    parse_mode: 'HTML'
                });
            }
        };
    },

    // Check if user has selected a role
    requireRole: () => {
        return async (ctx, next) => {
            try {
                if (!ctx.user) {
                    return await auth.ensureUser()(ctx, next);
                }

                if (!ctx.user.role || ctx.user.status === 'new') {
                    const keyboard = {
                        reply_markup: {
                            inline_keyboard: [
                                [{ text: '🏪 Start Registration', callback_data: 'start_registration' }]
                            ]
                        }
                    };

                    await ctx.reply(
                        '🎯 <b>Welcome to the Marketplace!</b>\n\n' +
                        '👋 You need to complete your registration first.\n\n' +
                        '📝 Click the button below to get started.',
                        { ...keyboard, parse_mode: 'HTML' }
                    );
                    return;
                }

                return next();
            } catch (error) {
                logger.error('Role check error', error, { userId: ctx.user?.id });
                await ctx.reply('❌ <b>Error</b>\n\nPlease try again.', {
                    parse_mode: 'HTML'
                });
            }
        };
    },

    // Check if user role is approved
    requireApproval: () => {
        return async (ctx, next) => {
            try {
                if (!ctx.user || !ctx.user.role) {
                    return await auth.requireRole()(ctx, next);
                }

                if (ctx.user.status === 'pending') {
                    const keyboard = {
                        reply_markup: {
                            inline_keyboard: [
                                [{ text: '📞 Contact Support', url: 'https://t.me/support' }],
                                [{ text: '🔄 Check Status', callback_data: 'check_approval_status' }]
                            ]
                        }
                    };

                    await ctx.reply(
                        '⏳ <b>Approval Pending</b>\n\n' +
                        '👥 Your role request is being reviewed by our admins.\n\n' +
                        '📅 This usually takes 24-48 hours.\n' +
                        '📲 You\'ll be notified once approved!',
                        { ...keyboard, parse_mode: 'HTML' }
                    );
                    return;
                }

                if (ctx.user.status === 'rejected') {
                    const keyboard = {
                        reply_markup: {
                            inline_keyboard: [
                                [{ text: '🔄 Apply Again', callback_data: 'reapply_role' }],
                                [{ text: '📞 Contact Support', url: 'https://t.me/support' }]
                            ]
                        }
                    };

                    await ctx.reply(
                        '❌ <b>Application Rejected</b>\n\n' +
                        '😔 Unfortunately, your role application was not approved.\n\n' +
                        '💬 Reason: ' + (ctx.user.rejectionReason || 'Not specified') + '\n\n' +
                        '🔄 You can apply again or contact support for help.',
                        { ...keyboard, parse_mode: 'HTML' }
                    );
                    return;
                }

                if (ctx.user.status !== 'approved') {
                    await ctx.reply('❌ <b>Access Denied</b>\n\nYour account is not approved for this action.', {
                        parse_mode: 'HTML'
                    });
                    return;
                }

                return next();
            } catch (error) {
                logger.error('Approval check error', error, { userId: ctx.user?.id });
                await ctx.reply('❌ <b>Error</b>\n\nPlease try again.', {
                    parse_mode: 'HTML'
                });
            }
        };
    },

    // Check if user has completed profile
    requireProfile: () => {
        return async (ctx, next) => {
            try {
                // First ensure user is approved
                const approvalCheck = auth.requireApproval();
                const result = await new Promise((resolve) => {
                    approvalCheck(ctx, () => resolve(true)).catch(() => resolve(false));
                });

                if (!result) return;

                // Check profile completion
                const profile = await profileService.findByUserId(ctx.user.id);
                
                if (!profile || !profile.isComplete) {
                    const keyboard = {
                        reply_markup: {
                            inline_keyboard: [
                                [{ text: '📝 Complete Profile', callback_data: 'complete_profile' }]
                            ]
                        }
                    };

                    await ctx.reply(
                        '📋 <b>Profile Incomplete</b>\n\n' +
                        '👤 Please complete your profile to access all features.\n\n' +
                        '✏️ We need a few more details about you.',
                        { ...keyboard, parse_mode: 'HTML' }
                    );
                    return;
                }

                // Store profile in context
                ctx.profile = profile;
                return next();
            } catch (error) {
                logger.error('Profile check error', error, { userId: ctx.user?.id });
                await ctx.reply('❌ <b>Error</b>\n\nPlease try again.', {
                    parse_mode: 'HTML'
                });
            }
        };
    },

    // Check if user has specific role
    requireSpecificRole: (allowedRoles) => {
        return async (ctx, next) => {
            try {
                // Ensure user has completed profile first
                const profileCheck = auth.requireProfile();
                const result = await new Promise((resolve) => {
                    profileCheck(ctx, () => resolve(true)).catch(() => resolve(false));
                });

                if (!result) return;

                if (!allowedRoles.includes(ctx.user.role)) {
                    await ctx.reply(
                        '🚫 <b>Access Restricted</b>\n\n' +
                        `❌ This feature is only available for: ${allowedRoles.join(', ')}\n\n` +
                        `👤 Your role: ${ctx.user.role}`,
                        { parse_mode: 'HTML' }
                    );
                    return;
                }

                return next();
            } catch (error) {
                logger.error('Role restriction error', error, { 
                    userId: ctx.user?.id, 
                    userRole: ctx.user?.role,
                    allowedRoles 
                });
                await ctx.reply('❌ <b>Error</b>\n\nPlease try again.', {
                    parse_mode: 'HTML'
                });
            }
        };
    },

    // Admin only access
    requireAdmin: () => {
        return async (ctx, next) => {
            try {
                const adminIds = process.env.ADMIN_IDS?.split(',').map(id => parseInt(id.trim())) || [];
                
                if (!adminIds.includes(ctx.from.id)) {
                    await ctx.reply('🚫 <b>Admin Access Required</b>\n\nThis command is only available to administrators.', {
                        parse_mode: 'HTML'
                    });
                    return;
                }

                // Set admin flag in context
                ctx.isAdmin = true;
                return next();
            } catch (error) {
                logger.error('Admin check error', error, { telegramId: ctx.from.id });
                await ctx.reply('❌ <b>Error</b>\n\nPlease try again.', {
                    parse_mode: 'HTML'
                });
            }
        };
    },

    // Check if user account is active (not banned)
    requireActiveAccount: () => {
        return async (ctx, next) => {
            try {
                if (!ctx.user) {
                    return await auth.ensureUser()(ctx, next);
                }

                if (ctx.user.status === 'banned' || ctx.user.status === 'suspended') {
                    const keyboard = {
                        reply_markup: {
                            inline_keyboard: [
                                [{ text: '📞 Contact Support', url: 'https://t.me/support' }]
                            ]
                        }
                    };

                    await ctx.reply(
                        '🚫 <b>Account Restricted</b>\n\n' +
                        `❌ Your account has been ${ctx.user.status}.\n\n` +
                        '📞 Please contact support for assistance.\n\n' +
                        '💬 Reason: ' + (ctx.user.restrictionReason || 'Not specified'),
                        { ...keyboard, parse_mode: 'HTML' }
                    );
                    return;
                }

                return next();
            } catch (error) {
                logger.error('Active account check error', error, { userId: ctx.user?.id });
                await ctx.reply('❌ <b>Error</b>\n\nPlease try again.', {
                    parse_mode: 'HTML'
                });
            }
        };
    },

    // Combine common auth checks
    requireFullAuth: () => {
        return async (ctx, next) => {
            const checks = [
                auth.ensureUser(),
                auth.requireActiveAccount(),
                auth.requireRole(),
                auth.requireApproval(),
                auth.requireProfile()
            ];

            for (const check of checks) {
                const result = await new Promise((resolve) => {
                    check(ctx, () => resolve(true)).catch(() => resolve(false));
                });

                if (!result) return;
            }

            return next();
        };
    }
};

module.exports = auth;
