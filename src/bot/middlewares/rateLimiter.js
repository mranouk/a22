const rateLimiter = require('../../utils/rateLimiter');
const logger = require('../../utils/logger');

// Middleware factory for different rate limiting scenarios
const rateLimitMiddleware = {
    // General purpose rate limiter
    general: (action, options = {}) => {
        return rateLimiter.middleware(action, options);
    },

    // User registration rate limiting
    registration: () => {
        return rateLimiter.middleware('user_registration');
    },

    // Profile update rate limiting
    profileUpdate: () => {
        return rateLimiter.middleware('profile_update');
    },

    // Listing creation rate limiting
    listingCreate: () => {
        return rateLimiter.middleware('listing_create');
    },

    // Listing interactions (like, save, report)
    listingInteraction: () => {
        return rateLimiter.middleware('listing_interaction');
    },

    // Wallet operations rate limiting
    walletOperation: () => {
        return rateLimiter.middleware('wallet_operation');
    },

    // Escrow operations rate limiting
    escrowOperation: () => {
        return rateLimiter.middleware('escrow_operation');
    },

    // Referral actions rate limiting
    referralAction: () => {
        return rateLimiter.middleware('referral_action');
    },

    // Trust score updates rate limiting
    trustScoreUpdate: () => {
        return rateLimiter.middleware('trust_score_update');
    },

    // Boost purchases rate limiting
    boostPurchase: () => {
        return rateLimiter.middleware('boost_purchase');
    },

    // Message sending rate limiting
    messageSend: () => {
        return rateLimiter.middleware('message_send');
    },

    // Search operations rate limiting
    searchOperation: () => {
        return rateLimiter.middleware('search_operation');
    },

    // Admin operations rate limiting
    adminOperation: () => {
        return rateLimiter.middleware('admin_operation');
    },

    // API calls rate limiting
    apiCall: () => {
        return rateLimiter.middleware('api_call');
    },

    // Custom rate limiter with specific options
    custom: (action, points = 10, duration = 60, blockDuration = 60) => {
        return rateLimiter.middleware(action, {
            points,
            duration,
            blockDuration
        });
    },

    // Multiple action rate limiter
    multiple: (actions) => {
        return async (ctx, next) => {
            const userId = ctx.from?.id;
            if (!userId) {
                return next();
            }

            // Check all actions
            for (const action of actions) {
                const result = await rateLimiter.canPerform(userId, action);
                if (!result.allowed) {
                    await ctx.reply(result.message, {
                        parse_mode: 'HTML'
                    });
                    return;
                }
            }

            return next();
        };
    },

    // Adaptive rate limiter based on user trust score
    adaptive: (baseAction) => {
        return async (ctx, next) => {
            const userId = ctx.from?.id;
            if (!userId) {
                return next();
            }

            // Get user trust score (if available)
            const trustScore = ctx.user?.trustScore || 0;
            
            // Adjust rate limits based on trust score
            let multiplier = 1;
            if (trustScore >= 800) {
                multiplier = 3; // High trust users get 3x the limits
            } else if (trustScore >= 500) {
                multiplier = 2; // Medium trust users get 2x the limits
            } else if (trustScore < 100) {
                multiplier = 0.5; // Low trust users get 0.5x the limits
            }

            const options = {
                points: Math.floor(10 * multiplier),
                duration: 60,
                blockDuration: Math.max(30, Math.floor(60 / multiplier))
            };

            const result = await rateLimiter.canPerform(userId, baseAction, options);
            
            if (!result.allowed) {
                let message = result.message;
                if (trustScore < 100) {
                    message += '\n\n💡 <i>Tip: Improve your trust score to get higher rate limits!</i>';
                }
                
                await ctx.reply(message, {
                    parse_mode: 'HTML'
                });
                return;
            }

            return next();
        };
    },

    // Burst protection for critical actions
    burstProtection: (action, burstPoints = 3, burstDuration = 10) => {
        return async (ctx, next) => {
            const userId = ctx.from?.id;
            if (!userId) {
                return next();
            }

            const burstAction = `${action}_burst`;
            const result = await rateLimiter.canPerform(userId, burstAction, {
                points: burstPoints,
                duration: burstDuration,
                blockDuration: burstDuration * 2
            });

            if (!result.allowed) {
                await ctx.reply(
                    '🚨 <b>Too Fast!</b>\n\n' +
                    '⚡ You\'re performing this action too quickly.\n\n' +
                    `⏳ Please wait ${result.retryAfter} seconds before trying again.\n\n` +
                    '🛡️ This protection helps maintain system stability.',
                    { parse_mode: 'HTML' }
                );
                return;
            }

            return next();
        };
    },

    // Daily limit enforcer
    dailyLimit: (action, dailyPoints = 100) => {
        return async (ctx, next) => {
            const userId = ctx.from?.id;
            if (!userId) {
                return next();
            }

            const dailyAction = `${action}_daily`;
            const result = await rateLimiter.canPerform(userId, dailyAction, {
                points: dailyPoints,
                duration: 86400, // 24 hours
                blockDuration: 3600 // 1 hour block
            });

            if (!result.allowed) {
                const remaining = await rateLimiter.getRemaining(userId, dailyAction);
                
                await ctx.reply(
                    '📅 <b>Daily Limit Reached</b>\n\n' +
                    `❌ You have reached your daily limit for this action.\n\n` +
                    `📊 Remaining today: ${remaining}/${dailyPoints}\n\n` +
                    '🔄 Limits reset at midnight UTC.',
                    { parse_mode: 'HTML' }
                );
                return;
            }

            return next();
        };
    },

    // Progressive rate limiting (gets stricter with repeated violations)
    progressive: (action) => {
        return async (ctx, next) => {
            const userId = ctx.from?.id;
            if (!userId) {
                return next();
            }

            // Check violation history
            const violationAction = `${action}_violations`;
            const violations = await rateLimiter.getRemaining(userId, violationAction);
            
            // Progressive penalties
            let blockMultiplier = 1;
            if (violations < 8) blockMultiplier = 2; // 2+ violations
            if (violations < 6) blockMultiplier = 4; // 4+ violations
            if (violations < 4) blockMultiplier = 8; // 6+ violations

            const result = await rateLimiter.canPerform(userId, action, {
                points: 10,
                duration: 60,
                blockDuration: 60 * blockMultiplier
            });

            if (!result.allowed) {
                // Record violation
                await rateLimiter.canPerform(userId, violationAction, {
                    points: 10,
                    duration: 86400, // 24 hours
                    blockDuration: 0
                });

                await ctx.reply(
                    '⚠️ <b>Rate Limit Exceeded</b>\n\n' +
                    `⏳ Please wait ${result.retryAfter} seconds.\n\n` +
                    `🔄 Block duration: ${Math.floor(result.retryAfter / 60)} minutes\n\n` +
                    `📈 Repeated violations increase penalty time.`,
                    { parse_mode: 'HTML' }
                );
                return;
            }

            return next();
        };
    }
};

module.exports = rateLimitMiddleware;
