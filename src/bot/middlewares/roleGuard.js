const logger = require('../../utils/logger');
const { ROLES } = require('../../utils/constants');

const roleGuard = {
    // Check if user can access vendor-specific features
    vendorOnly: () => {
        return async (ctx, next) => {
            try {
                if (!ctx.user || ctx.user.role !== 'vendor') {
                    const keyboard = {
                        reply_markup: {
                            inline_keyboard: [
                                [{ text: '🔄 Switch to Vendor', callback_data: 'switch_role_vendor' }],
                                [{ text: '⬅️ Back to Menu', callback_data: 'main_menu' }]
                            ]
                        }
                    };

                    await ctx.reply(
                        '🏪 <b>Vendor Access Required</b>\n\n' +
                        '❌ This feature is only available for vendors.\n\n' +
                        '💼 Vendors can create listings, manage inventory, and sell products.',
                        { ...keyboard, parse_mode: 'HTML' }
                    );
                    return;
                }

                return next();
            } catch (error) {
                logger.error('Vendor guard error', error, { userId: ctx.user?.id });
                await ctx.reply('❌ <b>Error</b>\n\nPlease try again.', {
                    parse_mode: 'HTML'
                });
            }
        };
    },

    // Check if user can access buyer-specific features
    buyerOnly: () => {
        return async (ctx, next) => {
            try {
                if (!ctx.user || ctx.user.role !== 'buyer') {
                    const keyboard = {
                        reply_markup: {
                            inline_keyboard: [
                                [{ text: '🔄 Switch to Buyer', callback_data: 'switch_role_buyer' }],
                                [{ text: '⬅️ Back to Menu', callback_data: 'main_menu' }]
                            ]
                        }
                    };

                    await ctx.reply(
                        '🛒 <b>Buyer Access Required</b>\n\n' +
                        '❌ This feature is only available for buyers.\n\n' +
                        '💳 Buyers can browse, purchase, and review products.',
                        { ...keyboard, parse_mode: 'HTML' }
                    );
                    return;
                }

                return next();
            } catch (error) {
                logger.error('Buyer guard error', error, { userId: ctx.user?.id });
                await ctx.reply('❌ <b>Error</b>\n\nPlease try again.', {
                    parse_mode: 'HTML'
                });
            }
        };
    },

    // Check if user can access caller-specific features
    callerOnly: () => {
        return async (ctx, next) => {
            try {
                if (!ctx.user || ctx.user.role !== 'caller') {
                    const keyboard = {
                        reply_markup: {
                            inline_keyboard: [
                                [{ text: '🔄 Switch to Caller', callback_data: 'switch_role_caller' }],
                                [{ text: '⬅️ Back to Menu', callback_data: 'main_menu' }]
                            ]
                        }
                    };

                    await ctx.reply(
                        '📞 <b>Caller Access Required</b>\n\n' +
                        '❌ This feature is only available for callers.\n\n' +
                        '💬 Callers can provide call services and manage communication.',
                        { ...keyboard, parse_mode: 'HTML' }
                    );
                    return;
                }

                return next();
            } catch (error) {
                logger.error('Caller guard error', error, { userId: ctx.user?.id });
                await ctx.reply('❌ <b>Error</b>\n\nPlease try again.', {
                    parse_mode: 'HTML'
                });
            }
        };
    },

    // Check if user can access multiple roles
    requireAnyRole: (allowedRoles) => {
        return async (ctx, next) => {
            try {
                if (!ctx.user || !allowedRoles.includes(ctx.user.role)) {
                    const roleButtons = allowedRoles.map(role => {
                        const roleEmojis = {
                            vendor: '🏪',
                            buyer: '🛒',
                            caller: '📞',
                            admin: '👑'
                        };
                        
                        return [{
                            text: `${roleEmojis[role] || '👤'} Switch to ${role.charAt(0).toUpperCase() + role.slice(1)}`,
                            callback_data: `switch_role_${role}`
                        }];
                    });

                    const keyboard = {
                        reply_markup: {
                            inline_keyboard: [
                                ...roleButtons,
                                [{ text: '⬅️ Back to Menu', callback_data: 'main_menu' }]
                            ]
                        }
                    };

                    await ctx.reply(
                        '🔐 <b>Role Access Required</b>\n\n' +
                        `❌ This feature requires one of these roles:\n${allowedRoles.map(r => `• ${r}`).join('\n')}\n\n` +
                        `👤 Your current role: ${ctx.user.role || 'None'}\n\n` +
                        '🔄 You can switch roles using the buttons below.',
                        { ...keyboard, parse_mode: 'HTML' }
                    );
                    return;
                }

                return next();
            } catch (error) {
                logger.error('Role guard error', error, { 
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

    // Check if user can create listings
    canCreateListings: () => {
        return roleGuard.requireAnyRole(['vendor', 'caller']);
    },

    // Check if user can make purchases
    canMakePurchases: () => {
        return roleGuard.requireAnyRole(['buyer']);
    },

    // Check if user can manage escrow
    canManageEscrow: () => {
        return roleGuard.requireAnyRole(['vendor', 'buyer']);
    },

    // Check if user can access wallet features
    canAccessWallet: () => {
        return roleGuard.requireAnyRole(['vendor', 'buyer', 'caller']);
    },

    // Check if user can boost listings
    canBoostListings: () => {
        return roleGuard.requireAnyRole(['vendor', 'caller']);
    },

    // Check if user can leave reviews
    canLeaveReviews: () => {
        return roleGuard.requireAnyRole(['buyer']);
    },

    // Check if user can accept reviews
    canReceiveReviews: () => {
        return roleGuard.requireAnyRole(['vendor', 'caller']);
    },

    // Check trust score requirements
    requireTrustScore: (minScore) => {
        return async (ctx, next) => {
            try {
                if (!ctx.user) {
                    await ctx.reply('❌ <b>Authentication Required</b>', {
                        parse_mode: 'HTML'
                    });
                    return;
                }

                const userTrustScore = ctx.user.trustScore || 0;

                if (userTrustScore < minScore) {
                    const keyboard = {
                        reply_markup: {
                            inline_keyboard: [
                                [{ text: '📊 View Trust Score', callback_data: 'view_trust_score' }],
                                [{ text: '💡 How to Improve', callback_data: 'trust_score_help' }],
                                [{ text: '⬅️ Back', callback_data: 'main_menu' }]
                            ]
                        }
                    };

                    await ctx.reply(
                        '⭐ <b>Trust Score Required</b>\n\n' +
                        `❌ This feature requires a trust score of at least ${minScore}.\n\n` +
                        `📊 Your current trust score: ${userTrustScore}\n\n` +
                        '💪 Complete more transactions and maintain good ratings to improve your score.',
                        { ...keyboard, parse_mode: 'HTML' }
                    );
                    return;
                }

                return next();
            } catch (error) {
                logger.error('Trust score guard error', error, { 
                    userId: ctx.user?.id,
                    requiredScore: minScore 
                });
                await ctx.reply('❌ <b>Error</b>\n\nPlease try again.', {
                    parse_mode: 'HTML'
                });
            }
        };
    },

    // Check if user has premium access
    requirePremium: () => {
        return async (ctx, next) => {
            try {
                if (!ctx.user) {
                    await ctx.reply('❌ <b>Authentication Required</b>', {
                        parse_mode: 'HTML'
                    });
                    return;
                }

                const isPremium = ctx.user.isPremium && 
                                 ctx.user.premiumExpiresAt && 
                                 new Date(ctx.user.premiumExpiresAt) > new Date();

                if (!isPremium) {
                    const keyboard = {
                        reply_markup: {
                            inline_keyboard: [
                                [{ text: '⭐ Upgrade to Premium', callback_data: 'upgrade_premium' }],
                                [{ text: '💎 Premium Benefits', callback_data: 'premium_benefits' }],
                                [{ text: '⬅️ Back', callback_data: 'main_menu' }]
                            ]
                        }
                    };

                    await ctx.reply(
                        '⭐ <b>Premium Feature</b>\n\n' +
                        '❌ This feature is only available for Premium members.\n\n' +
                        '💎 Premium benefits include:\n' +
                        '• Priority support\n' +
                        '• Advanced analytics\n' +
                        '• Unlimited listings\n' +
                        '• Priority display\n\n' +
                        '🚀 Upgrade now to unlock all features!',
                        { ...keyboard, parse_mode: 'HTML' }
                    );
                    return;
                }

                return next();
            } catch (error) {
                logger.error('Premium guard error', error, { userId: ctx.user?.id });
                await ctx.reply('❌ <b>Error</b>\n\nPlease try again.', {
                    parse_mode: 'HTML'
                });
            }
        };
    },

    // Check if user can perform action based on account age
    requireAccountAge: (minDays) => {
        return async (ctx, next) => {
            try {
                if (!ctx.user) {
                    await ctx.reply('❌ <b>Authentication Required</b>', {
                        parse_mode: 'HTML'
                    });
                    return;
                }

                const accountAge = Math.floor((new Date() - new Date(ctx.user.createdAt)) / (1000 * 60 * 60 * 24));

                if (accountAge < minDays) {
                    const remainingDays = minDays - accountAge;
                    
                    await ctx.reply(
                        '⏰ <b>Account Age Requirement</b>\n\n' +
                        `❌ This feature requires an account age of at least ${minDays} days.\n\n` +
                        `📅 Your account age: ${accountAge} days\n` +
                        `⏳ Days remaining: ${remainingDays}\n\n` +
                        '🔒 This restriction helps maintain security and trust.',
                        { parse_mode: 'HTML' }
                    );
                    return;
                }

                return next();
            } catch (error) {
                logger.error('Account age guard error', error, { 
                    userId: ctx.user?.id,
                    requiredDays: minDays 
                });
                await ctx.reply('❌ <b>Error</b>\n\nPlease try again.', {
                    parse_mode: 'HTML'
                });
            }
        };
    }
};

module.exports = roleGuard;
