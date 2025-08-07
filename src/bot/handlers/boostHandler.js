const boostService = require('../../services/boostService');
const walletService = require('../../services/walletService');
const marketplaceService = require('../../services/marketplaceService');
const notificationService = require('../../services/notificationService');
const { formatCurrency } = require('../../utils/helpers');
const logger = require('../../utils/logger');

const boostHandler = {
    // Handle boost purchase process
    async handleBoostPurchase(ctx, boostType, targetId, targetType) {
        try {
            const user = ctx.user;
            
            // Get boost package details
            const boostPackage = await boostService.getBoostPackageByType(boostType);
            if (!boostPackage) {
                await ctx.reply('❌ <b>Invalid boost package</b>', {
                    parse_mode: 'HTML'
                });
                return;
            }

            // Check user's wallet balance
            const hasBalance = await walletService.hasBalance(user.id, boostPackage.price);
            
            if (!hasBalance) {
                const keyboard = {
                    reply_markup: {
                        inline_keyboard: [
                            [{ text: '💰 Add Funds', callback_data: 'wallet_deposit' }],
                            [{ text: '⬅️ Back', callback_data: 'boost_main' }]
                        ]
                    }
                };

                await ctx.editMessageText(
                    '💳 <b>Insufficient Balance</b>\n\n' +
                    `💰 <b>Required:</b> ${formatCurrency(boostPackage.price)}\n` +
                    '📱 Please add funds to your wallet first.',
                    { ...keyboard, parse_mode: 'HTML' }
                );
                return;
            }

            // Process the boost purchase
            const result = await boostService.purchaseBoost(
                user.id,
                boostPackage.id,
                targetId,
                targetType
            );

            if (!result.success) {
                await ctx.reply(
                    `❌ <b>Boost Purchase Failed</b>\n\n${result.error}`,
                    { parse_mode: 'HTML' }
                );
                return;
            }

            // Deduct from wallet
            await walletService.transferFunds(
                user.id,
                'system', // System account
                boostPackage.price,
                `Boost Purchase - ${boostType}`
            );

            // Send success notification
            const keyboard = {
                reply_markup: {
                    inline_keyboard: [
                        [
                            { text: '📊 View Boost', callback_data: 'boost_my_boosts' },
                            { text: '🚀 Buy Another', callback_data: 'boost_packages' }
                        ],
                        [{ text: '🏠 Main Menu', callback_data: 'main_menu' }]
                    ]
                }
            };

            await ctx.editMessageText(
                '🎉 <b>Boost Activated!</b>\n\n' +
                `🚀 <b>Type:</b> ${boostType}\n` +
                `💰 <b>Cost:</b> ${formatCurrency(boostPackage.price)}\n` +
                `⏰ <b>Duration:</b> ${boostPackage.duration} hours\n` +
                `📈 <b>Visibility:</b> +${boostPackage.multiplier}x\n\n` +
                '✅ Your content is now boosted and will receive priority placement!',
                { ...keyboard, parse_mode: 'HTML' }
            );

            // Log the purchase
            logger.audit('boost_purchased', user.id, {
                boostType,
                targetId,
                targetType,
                amount: boostPackage.price,
                duration: boostPackage.duration
            });

            // Send notification to user
            await notificationService.sendNotification(user.id, {
                type: 'boost_activated',
                title: '🚀 Boost Activated',
                message: `Your ${boostType} boost is now active and running!`,
                data: { boostId: result.boostId, duration: boostPackage.duration }
            });

        } catch (error) {
            logger.error('Boost purchase handler error', error, {
                userId: ctx.user?.id,
                boostType,
                targetId,
                targetType
            });
            await ctx.reply('❌ <b>Error processing boost purchase</b>\n\nPlease try again.', {
                parse_mode: 'HTML'
            });
        }
    },

    // Handle boost expiration
    async handleBoostExpiration(boostId) {
        try {
            const boost = await boostService.getBoost(boostId);
            if (!boost) {
                logger.warn(`Boost not found: ${boostId}`);
                return;
            }

            // Mark boost as expired
            await boostService.expireBoost(boostId);

            // Send notification to user
            await notificationService.sendNotification(boost.userId, {
                type: 'boost_expired',
                title: '⏰ Boost Expired',
                message: `Your ${boost.type} boost has expired. Purchase a new boost to continue getting enhanced visibility!`,
                data: { boostId, expiredAt: new Date() }
            });

            // Update target visibility if it's a listing
            if (boost.targetType === 'listing') {
                await marketplaceService.updateListingBoostStatus(boost.targetId, false);
            }

            logger.info(`Boost expired: ${boostId}`, { userId: boost.userId });

        } catch (error) {
            logger.error('Boost expiration handler error', error, { boostId });
        }
    },

    // Handle boost renewal
    async handleBoostRenewal(ctx, boostId) {
        try {
            const user = ctx.user;
            const boost = await boostService.getBoost(boostId);

            if (!boost || boost.userId !== user.id) {
                await ctx.reply('❌ <b>Boost not found</b>', {
                    parse_mode: 'HTML'
                });
                return;
            }

            if (boost.status !== 'expired' && boost.status !== 'expiring') {
                await ctx.reply('❌ <b>Boost is still active</b>\n\nYou can only renew expired boosts.', {
                    parse_mode: 'HTML'
                });
                return;
            }

            // Get the same boost package
            const boostPackage = await boostService.getBoostPackage(boost.packageId);
            if (!boostPackage) {
                await ctx.reply('❌ <b>Boost package no longer available</b>', {
                    parse_mode: 'HTML'
                });
                return;
            }

            // Process renewal
            await this.handleBoostPurchase(ctx, boost.type, boost.targetId, boost.targetType);

        } catch (error) {
            logger.error('Boost renewal handler error', error, { userId: ctx.user?.id, boostId });
            await ctx.reply('❌ <b>Error renewing boost</b>\n\nPlease try again.', {
                parse_mode: 'HTML'
            });
        }
    },

    // Handle boost analytics request
    async handleBoostAnalytics(ctx, boostId) {
        try {
            const user = ctx.user;
            const analytics = await boostService.getBoostAnalytics(boostId, user.id);

            if (!analytics) {
                await ctx.reply('❌ <b>Analytics not available</b>', {
                    parse_mode: 'HTML'
                });
                return;
            }

            const keyboard = {
                reply_markup: {
                    inline_keyboard: [
                        [
                            { text: '📊 Detailed Report', callback_data: `boost_detailed_${boostId}` },
                            { text: '📈 Compare Boosts', callback_data: 'boost_compare' }
                        ],
                        [{ text: '⬅️ Back', callback_data: 'boost_my_boosts' }]
                    ]
                }
            };

            let message = '📊 <b>Boost Analytics</b>\n\n';
            message += `🚀 <b>Boost ID:</b> ${boostId.substring(0, 8)}...\n`;
            message += `📅 <b>Duration:</b> ${analytics.duration} hours\n`;
            message += `⏰ <b>Started:</b> ${new Date(analytics.startedAt).toLocaleDateString()}\n\n`;
            
            message += '📈 <b>Performance:</b>\n';
            message += `👀 Extra Views: +${analytics.additionalViews}\n`;
            message += `💬 Extra Inquiries: +${analytics.additionalInquiries}\n`;
            message += `📊 CTR Improvement: +${analytics.ctrImprovement}%\n`;
            message += `💰 Revenue Generated: ${formatCurrency(analytics.revenueGenerated)}\n\n`;
            
            message += `🎯 <b>ROI:</b> ${analytics.roi}%`;

            await ctx.editMessageText(message, { ...keyboard, parse_mode: 'HTML' });

        } catch (error) {
            logger.error('Boost analytics handler error', error, { userId: ctx.user?.id, boostId });
            await ctx.reply('❌ <b>Error loading analytics</b>\n\nPlease try again.', {
                parse_mode: 'HTML'
            });
        }
    },

    // Handle boost cancellation
    async handleBoostCancellation(ctx, boostId) {
        try {
            const user = ctx.user;
            const boost = await boostService.getBoost(boostId);

            if (!boost || boost.userId !== user.id) {
                await ctx.reply('❌ <b>Boost not found</b>', {
                    parse_mode: 'HTML'
                });
                return;
            }

            if (boost.status !== 'active') {
                await ctx.reply('❌ <b>Only active boosts can be cancelled</b>', {
                    parse_mode: 'HTML'
                });
                return;
            }

            // Calculate refund amount (if applicable)
            const refundAmount = await boostService.calculateRefund(boostId);

            const keyboard = {
                reply_markup: {
                    inline_keyboard: [
                        [
                            { text: '✅ Confirm Cancel', callback_data: `boost_confirm_cancel_${boostId}` },
                            { text: '❌ Keep Boost', callback_data: 'boost_my_boosts' }
                        ]
                    ]
                }
            };

            let message = '🚫 <b>Cancel Boost</b>\n\n';
            message += `🚀 <b>Boost ID:</b> ${boostId.substring(0, 8)}...\n`;
            message += `⏰ <b>Time Remaining:</b> ${boost.remainingHours} hours\n\n`;
            
            if (refundAmount > 0) {
                message += `💰 <b>Refund Amount:</b> ${formatCurrency(refundAmount)}\n`;
                message += '💡 Refund will be credited to your wallet.\n\n';
            } else {
                message += '💡 No refund available for this boost.\n\n';
            }
            
            message += '⚠️ <b>Warning:</b> Cancelling will immediately stop the boost effect.';

            await ctx.editMessageText(message, { ...keyboard, parse_mode: 'HTML' });

        } catch (error) {
            logger.error('Boost cancellation handler error', error, { userId: ctx.user?.id, boostId });
            await ctx.reply('❌ <b>Error processing cancellation</b>\n\nPlease try again.', {
                parse_mode: 'HTML'
            });
        }
    }
};

module.exports = boostHandler;
