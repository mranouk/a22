const referralService = require('../../services/referralService');
const userService = require('../../services/userService');
const { formatCurrency } = require('../../utils/helpers');
const logger = require('../../utils/logger');

const referral = {
    // Main referral menu
    async showMainMenu(ctx) {
        try {
            const user = ctx.user;
            const referralStats = await referralService.getUserReferralStats(user.id);

            const keyboard = {
                reply_markup: {
                    inline_keyboard: [
                        [
                            { text: '📋 Copy Referral Link', callback_data: 'referral_copy_link' },
                            { text: '📊 My Statistics', callback_data: 'referral_stats' }
                        ],
                        [
                            { text: '👥 My Referrals', callback_data: 'referral_list' },
                            { text: '💰 Earnings', callback_data: 'referral_earnings' }
                        ],
                        [
                            { text: '🎁 Claim Rewards', callback_data: 'referral_claim' },
                            { text: '❓ How It Works', callback_data: 'referral_help' }
                        ],
                        [
                            { text: '⬅️ Back to Menu', callback_data: 'main_menu' }
                        ]
                    ]
                }
            };

            let message = '🤝 <b>Referral Program</b>\n\n';
            message += `🔗 <b>Your Referral Code:</b> <code>${user.referralCode || 'Loading...'}</code>\n\n`;
            message += `👥 <b>Total Referrals:</b> ${referralStats.totalReferrals}\n`;
            message += `✅ <b>Active Referrals:</b> ${referralStats.activeReferrals}\n`;
            message += `💰 <b>Total Earned:</b> ${formatCurrency(referralStats.totalEarnings)}\n`;
            message += `💎 <b>Available Rewards:</b> ${formatCurrency(referralStats.availableRewards)}\n\n`;
            
            message += '🎯 <b>Earn More:</b>\n';
            message += '• $10 for each new user\n';
            message += '• $5 bonus when they make first purchase\n';
            message += '• 2% commission on their transactions\n';
            message += '• Monthly bonuses for top referrers';

            await ctx.editMessageText(message, { ...keyboard, parse_mode: 'HTML' });
        } catch (error) {
            logger.error('Referral main menu error', error, { userId: ctx.user?.id });
            await ctx.reply('❌ <b>Error loading referral program</b>\n\nPlease try again.', {
                parse_mode: 'HTML'
            });
        }
    },

    // Show referral link
    async showReferralLink(ctx) {
        try {
            const user = ctx.user;
            
            if (!user.referralCode) {
                const updatedUser = await userService.generateReferralCode(user.id);
                user.referralCode = updatedUser.referralCode;
            }

            const botUsername = process.env.BOT_USERNAME || 'marketplace_bot';
            const referralLink = `https://t.me/${botUsername}?start=${user.referralCode}`;

            const keyboard = {
                reply_markup: {
                    inline_keyboard: [
                        [
                            { text: '📋 Copy Link', url: referralLink },
                            { text: '📤 Share Link', callback_data: 'referral_share' }
                        ],
                        [
                            { text: '📱 Generate QR Code', callback_data: 'referral_qr' },
                            { text: '💬 Share Message', callback_data: 'referral_message' }
                        ],
                        [
                            { text: '⬅️ Back to Referrals', callback_data: 'referral_main' }
                        ]
                    ]
                }
            };

            let message = '🔗 <b>Your Referral Link</b>\n\n';
            message += `<code>${referralLink}</code>\n\n`;
            message += '📤 <b>Share Methods:</b>\n';
            message += '• Copy and send directly\n';
            message += '• Share on social media\n';
            message += '• Send via email\n';
            message += '• Generate QR code\n\n';
            message += '💡 <b>Tip:</b> Add a personal message when sharing to increase conversion!';

            await ctx.editMessageText(message, { ...keyboard, parse_mode: 'HTML' });
        } catch (error) {
            logger.error('Show referral link error', error, { userId: ctx.user?.id });
            await ctx.reply('❌ <b>Error loading referral link</b>\n\nPlease try again.', {
                parse_mode: 'HTML'
            });
        }
    },

    // Show referral statistics
    async showStatistics(ctx) {
        try {
            const user = ctx.user;
            const stats = await referralService.getDetailedStats(user.id);

            const keyboard = {
                reply_markup: {
                    inline_keyboard: [
                        [
                            { text: '📊 This Month', callback_data: 'referral_stats_month' },
                            { text: '📈 All Time', callback_data: 'referral_stats_all' }
                        ],
                        [
                            { text: '🏆 Leaderboard', callback_data: 'referral_leaderboard' },
                            { text: '🎯 Goals', callback_data: 'referral_goals' }
                        ],
                        [
                            { text: '⬅️ Back to Referrals', callback_data: 'referral_main' }
                        ]
                    ]
                }
            };

            let message = '📊 <b>Referral Statistics</b>\n\n';
            message += `📅 <b>This Month:</b>\n`;
            message += `👥 New Referrals: ${stats.thisMonth.newReferrals}\n`;
            message += `💰 Earnings: ${formatCurrency(stats.thisMonth.earnings)}\n`;
            message += `🎯 Conversion Rate: ${stats.thisMonth.conversionRate}%\n\n`;
            
            message += `📈 <b>All Time:</b>\n`;
            message += `👥 Total Referrals: ${stats.allTime.totalReferrals}\n`;
            message += `✅ Active: ${stats.allTime.activeReferrals}\n`;
            message += `💰 Total Earned: ${formatCurrency(stats.allTime.totalEarnings)}\n`;
            message += `📊 Success Rate: ${stats.allTime.successRate}%\n\n`;
            
            message += `🏆 <b>Your Rank:</b> #${stats.rank || 'N/A'}\n`;
            message += `🎖️ <b>Level:</b> ${stats.level || 'Beginner'}`;

            await ctx.editMessageText(message, { ...keyboard, parse_mode: 'HTML' });
        } catch (error) {
            logger.error('Referral statistics error', error, { userId: ctx.user?.id });
            await ctx.reply('❌ <b>Error loading statistics</b>\n\nPlease try again.', {
                parse_mode: 'HTML'
            });
        }
    },

    // Show referral list
    async showReferralList(ctx, page = 1) {
        try {
            const limit = 10;
            const offset = (page - 1) * limit;
            const referrals = await referralService.getUserReferrals(ctx.user.id, limit, offset);

            if (!referrals.data.length) {
                const keyboard = {
                    reply_markup: {
                        inline_keyboard: [
                            [{ text: '📤 Share Your Link', callback_data: 'referral_copy_link' }],
                            [{ text: '⬅️ Back', callback_data: 'referral_main' }]
                        ]
                    }
                };

                await ctx.editMessageText(
                    '👥 <b>My Referrals</b>\n\n' +
                    '📭 You haven\'t referred anyone yet.\n\n' +
                    '💡 Start sharing your referral link to earn rewards!',
                    { ...keyboard, parse_mode: 'HTML' }
                );
                return;
            }

            let message = '👥 <b>My Referrals</b>\n\n';
            message += `📄 Page ${page} of ${Math.ceil(referrals.total / limit)}\n\n`;

            referrals.data.forEach((referral, index) => {
                const itemNumber = (page - 1) * limit + index + 1;
                const statusEmoji = referral.status === 'active' ? '✅' : '⏳';
                const earnedEmoji = referral.totalEarned > 0 ? '💰' : '⭕';
                
                message += `${statusEmoji} <b>${itemNumber}. ${referral.username || 'Anonymous'}</b>\n`;
                message += `📅 Joined: ${new Date(referral.joinedAt).toLocaleDateString()}\n`;
                message += `${earnedEmoji} Earned: ${formatCurrency(referral.totalEarned)}\n`;
                message += `📊 Status: ${referral.status}\n\n`;
            });

            // Create navigation buttons
            const navigationButtons = [];
            if (page > 1) {
                navigationButtons.push({
                    text: '◀️ Previous',
                    callback_data: `referral_list_${page - 1}`
                });
            }
            if (referrals.hasMore) {
                navigationButtons.push({
                    text: 'Next ▶️',
                    callback_data: `referral_list_${page + 1}`
                });
            }

            const keyboard = {
                reply_markup: {
                    inline_keyboard: [
                        navigationButtons.length ? navigationButtons : [],
                        [
                            { text: '🔄 Refresh', callback_data: `referral_list_${page}` },
                            { text: '⬅️ Back', callback_data: 'referral_main' }
                        ]
                    ].filter(row => row.length > 0)
                }
            };

            await ctx.editMessageText(message, { ...keyboard, parse_mode: 'HTML' });

        } catch (error) {
            logger.error('Referral list error', error, { userId: ctx.user?.id, page });
            await ctx.reply('❌ <b>Error loading referral list</b>\n\nPlease try again.', {
                parse_mode: 'HTML'
            });
        }
    },

    // Show earnings breakdown
    async showEarnings(ctx) {
        try {
            const earnings = await referralService.getEarningsBreakdown(ctx.user.id);

            const keyboard = {
                reply_markup: {
                    inline_keyboard: [
                        [
                            { text: '💰 Claim Rewards', callback_data: 'referral_claim' },
                            { text: '📊 Detailed Report', callback_data: 'referral_earnings_report' }
                        ],
                        [
                            { text: '⬅️ Back to Referrals', callback_data: 'referral_main' }
                        ]
                    ]
                }
            };

            let message = '💰 <b>Referral Earnings</b>\n\n';
            message += `💎 <b>Available to Claim:</b> ${formatCurrency(earnings.available)}\n`;
            message += `🔒 <b>Pending:</b> ${formatCurrency(earnings.pending)}\n`;
            message += `✅ <b>Total Claimed:</b> ${formatCurrency(earnings.claimed)}\n\n`;
            
            message += '📊 <b>Earning Sources:</b>\n';
            message += `👥 Registration Bonus: ${formatCurrency(earnings.registrationBonus)}\n`;
            message += `💳 First Purchase Bonus: ${formatCurrency(earnings.firstPurchaseBonus)}\n`;
            message += `📈 Transaction Commission: ${formatCurrency(earnings.commissions)}\n`;
            message += `🎁 Special Bonuses: ${formatCurrency(earnings.bonuses)}\n\n`;
            
            if (earnings.available > 0) {
                message += '🎉 <b>You have rewards ready to claim!</b>';
            } else {
                message += '💡 <b>Keep referring to earn more rewards!</b>';
            }

            await ctx.editMessageText(message, { ...keyboard, parse_mode: 'HTML' });
        } catch (error) {
            logger.error('Referral earnings error', error, { userId: ctx.user?.id });
            await ctx.reply('❌ <b>Error loading earnings</b>\n\nPlease try again.', {
                parse_mode: 'HTML'
            });
        }
    },

    // Claim referral rewards
    async claimRewards(ctx) {
        try {
            const result = await referralService.claimRewards(ctx.user.id);

            if (!result.success) {
                await ctx.reply(
                    `❌ <b>Cannot Claim Rewards</b>\n\n${result.error}`,
                    { parse_mode: 'HTML' }
                );
                return;
            }

            if (result.amount === 0) {
                const keyboard = {
                    reply_markup: {
                        inline_keyboard: [
                            [{ text: '📤 Share Link', callback_data: 'referral_copy_link' }],
                            [{ text: '⬅️ Back', callback_data: 'referral_main' }]
                        ]
                    }
                };

                await ctx.editMessageText(
                    '💰 <b>Claim Rewards</b>\n\n' +
                    '📭 No rewards available to claim right now.\n\n' +
                    '💡 Invite more friends to earn rewards!',
                    { ...keyboard, parse_mode: 'HTML' }
                );
                return;
            }

            const keyboard = {
                reply_markup: {
                    inline_keyboard: [
                        [
                            { text: '💰 View Wallet', callback_data: 'wallet_main' },
                            { text: '📤 Share More', callback_data: 'referral_copy_link' }
                        ],
                        [{ text: '🏠 Main Menu', callback_data: 'main_menu' }]
                    ]
                }
            };

            await ctx.editMessageText(
                '🎉 <b>Rewards Claimed!</b>\n\n' +
                `💰 <b>Amount:</b> ${formatCurrency(result.amount)}\n` +
                `💳 <b>Added to:</b> Your wallet\n\n` +
                '✅ Funds are immediately available for use.\n\n' +
                '🚀 Keep referring friends to earn even more!',
                { ...keyboard, parse_mode: 'HTML' }
            );

        } catch (error) {
            logger.error('Claim rewards error', error, { userId: ctx.user?.id });
            await ctx.reply('❌ <b>Error claiming rewards</b>\n\nPlease try again.', {
                parse_mode: 'HTML'
            });
        }
    },

    // Show how referral program works
    async showHelp(ctx) {
        try {
            const keyboard = {
                reply_markup: {
                    inline_keyboard: [
                        [
                            { text: '📤 Get My Link', callback_data: 'referral_copy_link' },
                            { text: '📊 View Examples', callback_data: 'referral_examples' }
                        ],
                        [
                            { text: '🎁 Reward Tiers', callback_data: 'referral_tiers' },
                            { text: '❓ FAQ', callback_data: 'referral_faq' }
                        ],
                        [
                            { text: '⬅️ Back to Referrals', callback_data: 'referral_main' }
                        ]
                    ]
                }
            };

            let message = '❓ <b>How Referrals Work</b>\n\n';
            message += '🎯 <b>Step 1:</b> Get your unique referral link\n';
            message += '📤 <b>Step 2:</b> Share it with friends\n';
            message += '👥 <b>Step 3:</b> They sign up using your link\n';
            message += '💰 <b>Step 4:</b> Earn rewards automatically!\n\n';
            
            message += '💎 <b>Reward Structure:</b>\n';
            message += '• $10 when someone joins\n';
            message += '• $5 when they make first purchase\n';
            message += '• 2% of their transaction volume\n';
            message += '• Monthly bonuses for top performers\n\n';
            
            message += '✅ <b>Benefits:</b>\n';
            message += '• Instant payouts to your wallet\n';
            message += '• No limits on referrals\n';
            message += '• Lifetime commissions\n';
            message += '• Bonus multipliers for active referrers';

            await ctx.editMessageText(message, { ...keyboard, parse_mode: 'HTML' });
        } catch (error) {
            logger.error('Referral help error', error, { userId: ctx.user?.id });
            await ctx.reply('❌ <b>Error loading help information</b>\n\nPlease try again.', {
                parse_mode: 'HTML'
            });
        }
    }
};

module.exports = referral;
