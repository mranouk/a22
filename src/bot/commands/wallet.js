// src/bot/commands/wallet.js
const walletService = require('../../services/walletService');
const { formatCurrency } = require('../../utils/helpers');
const logger = require('../../utils/logger');

const wallet = {
    // Main wallet menu
    async showMainMenu(ctx) {
        try {
            const user = ctx.user;
            const walletData = await walletService.getWallet(user.id);

            const keyboard = {
                reply_markup: {
                    inline_keyboard: [
                        [
                            { text: '💰 Deposit Funds', callback_data: 'wallet_deposit' },
                            { text: '⭐ Buy Stars', callback_data: 'wallet_buy_stars' }
                        ],
                        [
                            { text: '📊 Transaction History', callback_data: 'wallet_history' },
                            { text: '💸 Send Money', callback_data: 'wallet_send' }
                        ],
                        [
                            { text: '🛡️ Escrow Status', callback_data: 'wallet_escrow' },
                            { text: '⚙️ Settings', callback_data: 'wallet_settings' }
                        ],
                        [
                            { text: '🔄 Refresh', callback_data: 'wallet_main' },
                            { text: '⬅️ Back to Menu', callback_data: 'main_menu' }
                        ]
                    ]
                }
            };

            let message = '💰 <b>Your Wallet</b>\n\n';
            message += `💵 <b>USD Balance:</b> ${formatCurrency(walletData.balance)}\n`;
            message += `⭐ <b>Stars Balance:</b> ${walletData.starBalance} XTR\n`;
            
            if (walletData.escrowBalance > 0) {
                message += `🛡️ <b>In Escrow:</b> ${formatCurrency(walletData.escrowBalance)}\n`;
            }
            
            message += `\n💎 <b>Total Value:</b> ${formatCurrency(walletData.totalBalance)}\n\n`;
            message += `📊 <b>Status:</b> ${walletData.status.charAt(0).toUpperCase() + walletData.status.slice(1)}\n\n`;
            message += '💡 <b>Quick Actions:</b>\n';
            message += '• Add funds to make purchases\n';
            message += '• Buy Stars for premium features\n';
            message += '• Send money to other users\n';
            message += '• View transaction history';

            if (ctx.callbackQuery) {
                await ctx.editMessageText(message, { ...keyboard, parse_mode: 'HTML' });
            } else {
                await ctx.reply(message, { ...keyboard, parse_mode: 'HTML' });
            }
        } catch (error) {
            logger.error('Wallet main menu error', error, { userId: ctx.user?.id });
            await ctx.reply('❌ <b>Error loading wallet</b>\n\nPlease try again.', {
                parse_mode: 'HTML'
            });
        }
    },

    // Show deposit options
    async showDepositMenu(ctx) {
        try {
            const keyboard = {
                reply_markup: {
                    inline_keyboard: [
                        [
                            { text: '💵 $10', callback_data: 'wallet_deposit_10' },
                            { text: '💵 $25', callback_data: 'wallet_deposit_25' }
                        ],
                        [
                            { text: '💵 $50', callback_data: 'wallet_deposit_50' },
                            { text: '💵 $100', callback_data: 'wallet_deposit_100' }
                        ],
                        [
                            { text: '💰 Custom Amount', callback_data: 'wallet_deposit_custom' }
                        ],
                        [
                            { text: '⬅️ Back to Wallet', callback_data: 'wallet_main' }
                        ]
                    ]
                }
            };

            await ctx.editMessageText(
                '💰 <b>Deposit Funds</b>\n\n' +
                '💳 Choose an amount to add to your wallet:\n\n' +
                '✅ <b>Payment Methods:</b>\n' +
                '• Credit/Debit Cards\n' +
                '• Apple Pay / Google Pay\n' +
                '• Bank Transfer\n\n' +
                '🔒 All payments are secure and processed by Telegram.',
                { ...keyboard, parse_mode: 'HTML' }
            );
        } catch (error) {
            logger.error('Deposit menu error', error, { userId: ctx.user?.id });
            await ctx.reply('❌ <b>Error loading deposit options</b>\n\nPlease try again.', {
                parse_mode: 'HTML'
            });
        }
    },

    // Process deposit amount
    async processDeposit(ctx, amount) {
        try {
            const result = await walletService.createDepositInvoice(
                ctx.user.id,
                amount,
                `Wallet Deposit - ${formatCurrency(amount)}`
            );

            if (!result.success) {
                await ctx.reply('❌ <b>Failed to create payment invoice</b>\n\nPlease try again.', {
                    parse_mode: 'HTML'
                });
                return;
            }

            // Send invoice to user
            await ctx.replyWithInvoice(result.invoice);

            await ctx.reply(
                '💳 <b>Payment Invoice Sent!</b>\n\n' +
                '📋 Please complete the payment using the invoice above.\n\n' +
                '⏱️ <b>Note:</b> Invoice expires in 24 hours.\n' +
                '✅ Funds will be added to your wallet instantly after payment.',
                { parse_mode: 'HTML' }
            );

        } catch (error) {
            logger.error('Process deposit error', error, { userId: ctx.user?.id, amount });
            await ctx.reply('❌ <b>Error processing deposit</b>\n\nPlease try again.', {
                parse_mode: 'HTML'
            });
        }
    },

    // Show Stars purchase options
    async showStarsMenu(ctx) {
        try {
            const keyboard = {
                reply_markup: {
                    inline_keyboard: [
                        [
                            { text: '⭐ 100 Stars - $10', callback_data: 'wallet_stars_100' },
                            { text: '⭐ 250 Stars - $25', callback_data: 'wallet_stars_250' }
                        ],
                        [
                            { text: '⭐ 500 Stars - $50', callback_data: 'wallet_stars_500' },
                            { text: '⭐ 1000 Stars - $100', callback_data: 'wallet_stars_1000' }
                        ],
                        [
                            { text: '⬅️ Back to Wallet', callback_data: 'wallet_main' }
                        ]
                    ]
                }
            };

            await ctx.editMessageText(
                '⭐ <b>Buy Telegram Stars</b>\n\n' +
                '🌟 Stars are used for premium features:\n' +
                '• Boost your listings\n' +
                '• Premium account upgrades\n' +
                '• Special marketplace features\n' +
                '• Priority support\n\n' +
                '💰 <b>Choose a package:</b>',
                { ...keyboard, parse_mode: 'HTML' }
            );
        } catch (error) {
            logger.error('Stars menu error', error, { userId: ctx.user?.id });
            await ctx.reply('❌ <b>Error loading Stars options</b>\n\nPlease try again.', {
                parse_mode: 'HTML'
            });
        }
    },

    // Process Stars purchase
    async processStarsPurchase(ctx, starsAmount) {
        try {
            const result = await walletService.createStarsDepositInvoice(
                ctx.user.id,
                starsAmount,
                `${starsAmount} Telegram Stars`
            );

            if (!result.success) {
                await ctx.reply('❌ <b>Failed to create Stars invoice</b>\n\nPlease try again.', {
                    parse_mode: 'HTML'
                });
                return;
            }

            // Send Stars invoice
            await ctx.replyWithInvoice(result.invoice);

            await ctx.reply(
                `⭐ <b>Stars Purchase Invoice Sent!</b>\n\n` +
                `🎯 <b>Package:</b> ${starsAmount} Telegram Stars\n` +
                `💎 You'll receive premium features access immediately after payment.\n\n` +
                `⏱️ <b>Note:</b> Invoice expires in 24 hours.`,
                { parse_mode: 'HTML' }
            );

        } catch (error) {
            logger.error('Process Stars purchase error', error, { userId: ctx.user?.id, starsAmount });
            await ctx.reply('❌ <b>Error processing Stars purchase</b>\n\nPlease try again.', {
                parse_mode: 'HTML'
            });
        }
    },

    // Show transaction history
    async showTransactionHistory(ctx, page = 1) {
        try {
            const limit = 10;
            const offset = (page - 1) * limit;
            const history = await walletService.getTransactionHistory(ctx.user.id, limit, offset);

            if (!history.transactions.length) {
                const keyboard = {
                    reply_markup: {
                        inline_keyboard: [
                            [{ text: '💰 Make First Deposit', callback_data: 'wallet_deposit' }],
                            [{ text: '⬅️ Back to Wallet', callback_data: 'wallet_main' }]
                        ]
                    }
                };

                await ctx.editMessageText(
                    '📊 <b>Transaction History</b>\n\n' +
                    '📭 No transactions yet.\n\n' +
                    '💡 Make your first deposit to get started!',
                    { ...keyboard, parse_mode: 'HTML' }
                );
                return;
            }

            let message = '📊 <b>Transaction History</b>\n\n';
            message += `📄 Page ${page} of ${Math.ceil(history.total / limit)}\n\n`;

            history.transactions.forEach((tx, index) => {
                const emoji = {
                    deposit: '💰',
                    withdrawal: '💸',
                    transfer_in: '📈',
                    transfer_out: '📉',
                    escrow_created: '🛡️',
                    escrow_released: '✅',
                    escrow_received: '💰',
                    stars_deposit: '⭐',
                    boost_purchase: '🚀',
                    premium_purchase: '💎'
                };

                const statusEmoji = {
                    completed: '✅',
                    pending: '⏳',
                    failed: '❌',
                    cancelled: '🚫'
                };

                const amount = tx.amount > 0 ? `+${tx.amount}` : tx.amount;
                message += `${emoji[tx.type] || '💼'} ${statusEmoji[tx.status]} <b>${amount} ${tx.currency}</b>\n`;
                message += `📝 ${tx.description || tx.type.replace(/_/g, ' ')}\n`;
                message += `⏰ ${new Date(tx.createdAt).toLocaleDateString()}\n\n`;
            });

            // Create navigation buttons
            const navigationButtons = [];
            if (page > 1) {
                navigationButtons.push({
                    text: '◀️ Previous',
                    callback_data: `wallet_history_${page - 1}`
                });
            }
            if (history.hasMore) {
                navigationButtons.push({
                    text: 'Next ▶️',
                    callback_data: `wallet_history_${page + 1}`
                });
            }

            const keyboard = {
                reply_markup: {
                    inline_keyboard: [
                        navigationButtons.length ? navigationButtons : [],
                        [
                            { text: '🔄 Refresh', callback_data: `wallet_history_${page}` },
                            { text: '⬅️ Back', callback_data: 'wallet_main' }
                        ]
                    ].filter(row => row.length > 0)
                }
            };

            await ctx.editMessageText(message, { ...keyboard, parse_mode: 'HTML' });

        } catch (error) {
            logger.error('Transaction history error', error, { userId: ctx.user?.id, page });
            await ctx.reply('❌ <b>Error loading transaction history</b>\n\nPlease try again.', {
                parse_mode: 'HTML'
            });
        }
    },

    // Show escrow status
    async showEscrowStatus(ctx) {
        try {
            const walletData = await walletService.getWallet(ctx.user.id);

            const keyboard = {
                reply_markup: {
                    inline_keyboard: [
                        [
                            { text: '📋 View Active Escrows', callback_data: 'wallet_escrow_active' },
                            { text: '📜 Escrow History', callback_data: 'wallet_escrow_history' }
                        ],
                        [
                            { text: '❓ How Escrow Works', callback_data: 'wallet_escrow_help' },
                            { text: '⬅️ Back', callback_data: 'wallet_main' }
                        ]
                    ]
                }
            };

            let message = '🛡️ <b>Escrow Status</b>\n\n';
            message += `💰 <b>Funds in Escrow:</b> ${formatCurrency(walletData.escrowBalance)}\n\n`;
            
            if (walletData.escrowBalance > 0) {
                message += '🔒 <b>Your funds are safely secured!</b>\n';
                message += '• Protected until transaction completion\n';
                message += '• Automatic release upon confirmation\n';
                message += '• Dispute resolution available\n\n';
            } else {
                message += '✅ <b>No active escrows</b>\n';
                message += 'All your transactions are completed!\n\n';
            }
            
            message += '💡 <b>Escrow protects:</b>\n';
            message += '• Buyers from non-delivery\n';
            message += '• Sellers from non-payment\n';
            message += '• Both parties with secure transactions';

            await ctx.editMessageText(message, { ...keyboard, parse_mode: 'HTML' });

        } catch (error) {
            logger.error('Escrow status error', error, { userId: ctx.user?.id });
            await ctx.reply('❌ <b>Error loading escrow status</b>\n\nPlease try again.', {
                parse_mode: 'HTML'
            });
        }
    }
};

module.exports = wallet;

