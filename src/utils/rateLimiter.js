const { RateLimiterMemory } = require('rate-limiter-flexible');
const logger = require('./logger');

class RateLimiter {
    constructor() {
        this.limiters = new Map();
        this.defaultOptions = {
            points: 10, // Number of requests
            duration: 60, // Per 60 seconds
            blockDuration: 60, // Block for 60 seconds if limit exceeded
        };
    }

    // Create a rate limiter for a specific action
    createLimiter(action, options = {}) {
        const config = { ...this.defaultOptions, ...options };
        const limiter = new RateLimiterMemory(config);
        this.limiters.set(action, limiter);
        
        logger.info(`Rate limiter created for action: ${action}`, config);
        return limiter;
    }

    // Get or create a rate limiter
    getLimiter(action, options = {}) {
        if (!this.limiters.has(action)) {
            this.createLimiter(action, options);
        }
        return this.limiters.get(action);
    }

    // Check if user can perform action
    async canPerform(userId, action, options = {}) {
        const limiter = this.getLimiter(action, options);
        const key = `${userId}:${action}`;

        try {
            await limiter.consume(key);
            return { allowed: true };
        } catch (rejRes) {
            const secs = Math.round(rejRes.msBeforeNext / 1000) || 1;
            logger.warn(`Rate limit exceeded for user ${userId} on action ${action}. Retry in ${secs}s`);
            
            return {
                allowed: false,
                retryAfter: secs,
                message: `⏳ Rate limit exceeded. Please wait ${secs} seconds before trying again.`
            };
        }
    }

    // Reset rate limit for a user and action
    async reset(userId, action) {
        const limiter = this.getLimiter(action);
        const key = `${userId}:${action}`;
        
        try {
            await limiter.delete(key);
            logger.info(`Rate limit reset for user ${userId} on action ${action}`);
            return true;
        } catch (error) {
            logger.error('Failed to reset rate limit', error, { userId, action });
            return false;
        }
    }

    // Get remaining points for a user and action
    async getRemaining(userId, action) {
        const limiter = this.getLimiter(action);
        const key = `${userId}:${action}`;
        
        try {
            const res = await limiter.get(key);
            return res ? res.remainingPoints : limiter.points;
        } catch (error) {
            logger.error('Failed to get remaining points', error, { userId, action });
            return 0;
        }
    }

    // Preset rate limiters for common actions
    setupDefaultLimiters() {
        // User onboarding and registration
        this.createLimiter('user_registration', {
            points: 3,
            duration: 3600, // 1 hour
            blockDuration: 3600
        });

        // Profile updates
        this.createLimiter('profile_update', {
            points: 5,
            duration: 3600,
            blockDuration: 600
        });

        // Listing creation
        this.createLimiter('listing_create', {
            points: 10,
            duration: 3600,
            blockDuration: 300
        });

        // Listing interactions (like, save, report)
        this.createLimiter('listing_interaction', {
            points: 50,
            duration: 3600,
            blockDuration: 60
        });

        // Wallet operations
        this.createLimiter('wallet_operation', {
            points: 20,
            duration: 3600,
            blockDuration: 300
        });

        // Escrow operations
        this.createLimiter('escrow_operation', {
            points: 5,
            duration: 3600,
            blockDuration: 600
        });

        // Referral actions
        this.createLimiter('referral_action', {
            points: 10,
            duration: 3600,
            blockDuration: 300
        });

        // Trust score updates
        this.createLimiter('trust_score_update', {
            points: 20,
            duration: 3600,
            blockDuration: 60
        });

        // Boost purchases
        this.createLimiter('boost_purchase', {
            points: 3,
            duration: 3600,
            blockDuration: 1800
        });

        // Message sending
        this.createLimiter('message_send', {
            points: 30,
            duration: 60,
            blockDuration: 60
        });

        // Search operations
        this.createLimiter('search_operation', {
            points: 100,
            duration: 3600,
            blockDuration: 60
        });

        // Admin operations
        this.createLimiter('admin_operation', {
            points: 50,
            duration: 3600,
            blockDuration: 300
        });

        // API calls
        this.createLimiter('api_call', {
            points: 1000,
            duration: 3600,
            blockDuration: 60
        });

        logger.info('Default rate limiters initialized');
    }

    // Middleware for Telegraf
    middleware(action, options = {}) {
        return async (ctx, next) => {
            const userId = ctx.from?.id;
            if (!userId) {
                return next();
            }

            const result = await this.canPerform(userId, action, options);
            
            if (!result.allowed) {
                await ctx.reply(result.message, {
                    parse_mode: 'HTML'
                });
                return;
            }

            return next();
        };
    }

    // Bulk check for multiple actions
    async canPerformBulk(userId, actions) {
        const results = {};
        
        for (const action of actions) {
            results[action] = await this.canPerform(userId, action);
        }
        
        return results;
    }

    // Get statistics for monitoring
    getStats() {
        const stats = {
            totalLimiters: this.limiters.size,
            limiters: []
        };

        for (const [action, limiter] of this.limiters.entries()) {
            stats.limiters.push({
                action,
                points: limiter.points,
                duration: limiter.duration,
                blockDuration: limiter.blockDuration
            });
        }

        return stats;
    }

    // Clear all rate limits for a user
    async clearUserLimits(userId) {
        let cleared = 0;
        
        for (const [action, limiter] of this.limiters.entries()) {
            try {
                const key = `${userId}:${action}`;
                await limiter.delete(key);
                cleared++;
            } catch (error) {
                logger.error(`Failed to clear limit for ${action}`, error, { userId });
            }
        }
        
        logger.info(`Cleared ${cleared} rate limits for user ${userId}`);
        return cleared;
    }

    // Emergency reset - clear all limits
    async emergencyReset() {
        try {
            for (const [action, limiter] of this.limiters.entries()) {
                await limiter.delete();
            }
            logger.warn('Emergency reset performed - all rate limits cleared');
            return true;
        } catch (error) {
            logger.error('Failed to perform emergency reset', error);
            return false;
        }
    }
}

// Export singleton instance
const rateLimiter = new RateLimiter();
rateLimiter.setupDefaultLimiters();

module.exports = rateLimiter;
