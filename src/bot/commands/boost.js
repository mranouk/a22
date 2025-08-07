const boostService = require('../../services/boostService');
const walletService = require('../../services/walletService');
const marketplaceService = require('../../services/marketplaceService');
const { formatCurrency } = require('../../utils/helpers');
const logger = require('../../utils/logger');

const boost = {
    // Main boost menu
    async showMainMenu(ctx) {
        try {
            const user = ctx.user;
            const activeBoosts = await boostService.getActiveBoosts(user.id);

            const keyboard = {
                reply_markup: {
                    inline_keyboard: [
                        [
                            { text: '🚀 Boost Listing', callback_data: 'boost_listing' },
                            { text: '⭐ Boost Profile', callback_data: 'boost_profile' }
                        ],
                        [
                            { text: '📊 My Boosts', callback_data: 'boost_my_boosts' },
                            { text: '💰 Boost Packages', callback_data: 'boost_packages' }
                        ],
                        [
                            { text: '📈 Analytics', callback_data: 'boost_analytics' },
                            { text: '❓ How It Works', callback_data: 'boost_help' }
                        ],
                        [
                            { text: '⬅️ Back to Menu', callback_data: 'main_menu' }
                        ]
                    ]
                }
            };

            let message = '🚀 <b>Boost Center</b>\n\n';
            message += '⚡ Supercharge your listings and profile!\n\n';
            
            if (activeBoosts.length > 0) {
                message += `🔥 <b>Active Boosts:</b> ${activeBoosts.length}\n`;
                const totalViews = activeBoosts.reduce((sum, boost) => sum + (boost.additionalViews || 0), 0);
                message += `👀 Extra Views: +${totalViews}\n\n`;
            }

            message += '💡 <b>Boost Benefits:</b>\n';
            message += '• 🎯 10x more visibility\n';
            message += '• 📈 Priority placement\n';
            message += '• ⭐ Featured badge\n';
            message += '• 📊 Detailed analytics\n\n';
            message += '💸 <b>Pricing:</b> Starting from $5';

            await ctx.editMessageText(message, { ...keyboard, parse_mode: 'HTML' });
        } catch (error) {
            logger.error('Boost main menu error', error, { userId: ctx.user?.id });
            await ctx.reply('❌ <b>Error loading boost center</b>\n\nPlease try again.', {
                parse_mode: 'HTML'
            });
        }
    },

    // Show boost packages
    async showPackages(ctx) {
        try {
            const packages = await boostService.getBoostPackages();

            let message = '💰 <b>Boost Packages</b>\n\n';
            message += '🎯 Choose the perfect boost for your needs:\n\n';

            packages.forEach((pkg, index) => {
                const emoji = ['⚡', '🚀', '💥'][index] || '🔥';
                message += `${emoji} <b>${pkg.name}</b>\n`;
                message += `💰 ${formatCurrency(pkg.price)}\n`;
                message += `⏰ Duration: ${pkg.duration} hours\n`;
                message += `📈 Visibility: +${pkg.multiplier}x\n`;
                message += `💎 ${pkg.description}\n\n`;
            });

            const packageButtons = packages.map((pkg, index) => [
                { 
                    text: `💳 Buy ${pkg.name} - ${formatCurrency(pkg.price)}`, 
                    callback_data: `boost_buy_package_${pkg.id}` 
                }
            ]);

            const keyboard = {
                reply_markup: {
                    inline_keyboard: [
                        ...packageButtons,
                        [
                            { text: '💡 Custom Boost', callback_data: 'boost_custom' },
                            { text: '❓ Compare Plans', callback_data: 'boost_compare' }
                        ],
                        [{ text: '⬅️ Back to Boost Center', callback_data: 'boost_main' }]
                    ]
                }
            };

            await ctx.editMessageText(message, { ...keyboard, parse_mode: 'HTML' });
        } catch (error) {
            logger.error('Boost packages error', error, { userId: ctx.user?.id });
            await ctx.reply('❌ <b>Error loading boost packages</b>\n\nPlease try again.', {
                parse_mode: 'HTML'
            });
        }
    },

    // Boost a listing
    async boostListing(ctx) {
        try {
            const userListings = await marketplaceService.getUserListings(ctx.user.id, {
                status: 'active',
                limit: 10
            });

            if (!userListings.data.length) {
                const keyboard = {
                    reply_markup: {
                        inline_keyboard: [
                            [{ text: '➕ Create Listing', callback_data: 'marketplace_create' }],
                            [{ text: '⬅️ Back', callback_data: 'boost_main' }]
                        ]
                    }
                };

                await ctx.editMessageText(
                    '📝 <b>Boost Listing</b>\n\n' +
                    '❌ You don\'t have any active listings to boost.\n\n' +
                    '💡 Create a listing first, then come back to boost it!',
                    { ...keyboard, parse_mode: 'HTML' }
                );
                return;
            }

            let message = '🚀 <b>Boost Listing</b>\n\n';
            message += '📝 Select a listing to boost:\n\n';

            userListings.data.forEach((listing, index) => {
                const boost = listing.boosted ? '🚀 ' : '';
                message += `${boost}<b>${index + 1}. ${listing.title}</b>\n`;
                message += `💰 ${formatCurrency(listing.price)}\n`;
                message += `👀 Views: ${listing.views || 0}\n`;
                if (listing.boosted) {
                    message += `⏰ Boost expires: ${new Date(listing.boostExpiresAt).toLocaleDateString()}\n`;
                }
                message += '\n';
            });

            const listingButtons = userListings.data.map((listing, index) => [
                { 
                    text: `🚀 Boost "${listing.title.substring(0, 20)}..."`, 
                    callback_data: `boost_select_listing_${listing.id}` 
                }
            ]);

            const keyboard = {
                reply_markup: {
                    inline_keyboard: [
                        ...listingButtons,
                        [{ text: '⬅️ Back to Boost Center', callback_data: 'boost_main' }]
                    ]
                }
            };

            await ctx.editMessageText(message, { ...keyboard, parse_mode: 'HTML' });
        } catch (error) {
            logger.error('Boost listing error', error, { userId: ctx.user?.id });
            await ctx.reply('❌ <b>Error loading listings</b>\n\nPlease try again.', {
                parse_mode: 'HTML'
            });
        }
    },

    // Show user's active boosts
    async showMyBoosts(ctx) {
        try {
            const boosts = await boostService.getUserBoosts(ctx.user.id);

            if (!boosts.length) {
                const keyboard = {
                    reply_markup: {
                        inline_keyboard: [
                            [{ text: '🚀 Buy First Boost', callback_data: 'boost_packages' }],
                            [{ text: '⬅️ Back', callback_data: 'boost_main' }]
                        ]
                    }
                };

                await ctx.editMessageText(
                    '📊 <b>My Boosts</b>\n\n' +
                    '📭 You don\'t have any boosts yet.\n\n' +
                    '💡 Purchase your first boost to increase visibility!',
                    { ...keyboard, parse_mode: 'HTML' }
                );
                return;
            }

            let message = '📊 <b>My Boosts</b>\n\n';
            
            const activeBoosts = boosts.filter(boost => boost.status === 'active');
            const expiredBoosts = boosts.filter(boost => boost.status === 'expired');

            if (activeBoosts.length > 0) {
                message += '🔥 <b>Active Boosts:</b>\n\n';
                activeBoosts.forEach((boost, index) => {
                    message += `🚀 <b>${boost.type}: ${boost.targetTitle || 'Profile'}</b>\n`;
                    message += `💰 ${formatCurrency(boost.amount)}\n`;
                    message += `⏰ Expires: ${new Date(boost.expiresAt).toLocaleDateString()}\n`;
                    message += `📈 Additional views: +${boost.additionalViews || 0}\n\n`;
                });
            }

            if (expiredBoosts.length > 0) {
                message += `📋 <b>Boost History:</b> ${expiredBoosts.length} completed\n\n`;
            }

            const totalSpent = boosts.reduce((sum, boost) => sum + boost.amount, 0);
            const totalViews = boosts.reduce((sum, boost) => sum + (boost.additionalViews || 0), 0);
            
            message += '📊 <b>Statistics:</b>\n';
            message += `💸 Total spent: ${formatCurrency(totalSpent)}\n`;
            message += `👀 Extra views: +${totalViews}\n`;
            message += `🎯 Boosts purchased: ${boosts.length}`;

            const keyboard = {
                reply_markup: {
                    inline_keyboard: [
                        [
                            { text: '🚀 Buy More Boosts', callback_data: 'boost_packages' },
                            { text: '📈 Detailed Analytics', callback_data: 'boost_analytics' }
                        ],
                        [
                            { text: '🔄 Refresh', callback_data: 'boost_my_boosts' },
                            { text: '⬅️ Back', callback_data: 'boost_main' }
                        ]
                    ]
                }
            };

            await ctx.editMessageText(message, { ...keyboard, parse_mode: 'HTML' });
        } catch (error) {
            logger.error('My boosts error', error, { userId: ctx.user?.id });
            await ctx.reply('❌ <b>Error loading your boosts</b>\n\nPlease try again.', {
                parse_mode: 'HTML'
            });
        }
    },

    // Purchase boost confirmation
    async confirmPurchase(ctx, packageId, targetId, targetType) {
        try {
            const package = await boostService.getBoostPackage(packageId);
            const wallet = await walletService.getWallet(ctx.user.id);

            if (!package) {
                await ctx.reply('❌ <b>Invalid boost package</b>', {
                    parse_mode: 'HTML'
                });
                return;
            }

            // Check if user has enough balance
            const hasEnoughBalance = await walletService.hasBalance(ctx.user.id, package.price);

            let message = '💳 <b>Confirm Boost Purchase</b>\n\n';
            message += `🎯 <b>Package:</b> ${package.name}\n`;
            message += `💰 <b>Price:</b> ${formatCurrency(package.price)}\n`;
            message += `⏰ <b>Duration:</b> ${package.duration} hours\n`;
            message += `📈 <b>Visibility:</b> +${package.multiplier}x\n\n`;

            if (targetType === 'listing') {
                const listing = await marketplaceService.getListing(targetId);
                message += `📝 <b>Target:</b> ${listing?.title || 'Unknown listing'}\n\n`;
            } else {
                message += `👤 <b>Target:</b> Your profile\n\n`;
            }

            message += `💼 <b>Your balance:</b> ${formatCurrency(wallet.balance)}\n`;

            if (!hasEnoughBalance) {
                message += '\n❌ <b>Insufficient balance!</b>\n';
                message += 'Please deposit funds to your wallet first.';

                const keyboard = {
                    reply_markup: {
                        inline_keyboard: [
                            [{ text: '💰 Deposit Funds', callback_data: 'wallet_deposit' }],
                            [{ text: '⬅️ Back', callback_data: 'boost_packages' }]
                        ]
                    }
                };

                await ctx.editMessageText(message, { ...keyboard, parse_mode: 'HTML' });
                return;
            }

            const keyboard = {
                reply_markup: {
                    inline_keyboard: [
                        [
                            { 
                                text: `✅ Confirm Purchase - ${formatCurrency(package.price)}`, 
                                callback_data: `boost_confirm_${packageId}_${targetId}_${targetType}` 
                            }
                        ],
                        [
                            { text: '❌ Cancel', callback_data: 'boost_packages' },
                            { text: '💰 Check Wallet', callback_data: 'wallet_main' }
                        ]
                    ]
                }
            };

            await ctx.editMessageText(message, { ...keyboard, parse_mode: 'HTML' });
        } catch (error) {
            logger.error('Confirm boost purchase error', error, { 
                userId: ctx.user?.id, 
                packageId, 
                targetId, 
                targetType 
            });
            await ctx.reply('❌ <b>Error processing request</b>\n\nPlease try again.', {
                parse_mode: 'HTML'
            });
        }
    },

    // Execute boost purchase
    async executePurchase(ctx, packageId, targetId, targetType) {
        try {
            const result = await boostService.purchaseBoost(
                ctx.user.id,
                packageId,
                targetId,
                targetType
            );

            if (!result.success) {
                await ctx.reply(
                    `❌ <b>Purchase Failed</b>\n\n${result.error}`,
                    { parse_mode: 'HTML' }
                );
                return;
            }

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
                '✅ Your boost has been successfully activated.\n\n' +
                '📈 <b>What happens now:</b>\n' +
                '• Your content gets priority placement\n' +
                '• 10x more visibility guaranteed\n' +
                '• Featured badge added\n' +
                '• Analytics tracking started\n\n' +
                '🔥 Watch your views skyrocket!',
                { ...keyboard, parse_mode: 'HTML' }
            );

            // Log the purchase
            logger.audit('boost_purchased', ctx.user.id, {
                packageId,
                targetId,
                targetType,
                amount: result.amount
            });

        } catch (error) {
            logger.error('Execute boost purchase error', error, { 
                userId: ctx.user?.id, 
                packageId, 
                targetId, 
                targetType 
            });
            await ctx.reply('❌ <b>Purchase Failed</b>\n\nPlease try again or contact support.', {
                parse_mode: 'HTML'
            });
        }
    }
};

module.exports = boost;
