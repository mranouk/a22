const db = require('../../services/db');
const logger = require('../../utils/logger');
const { Markup } = require('telegraf');

const wallet = {
    // Show main wallet menu
    async showMainMenu(ctx) {
        try {
            const walletData = await db.Wallet.findOne({ user: ctx.user._id });

            const keyboard = {
                reply_markup: {
                    inline_keyboard: [
                        [
                            { text: '➕ Deposit Funds', callback_data: 'wallet_deposit' },
                            { text: '⭐ Buy Stars', callback_data: 'wallet_buy_stars' }
                        ],
                        [
                            { text: '🕑 Transaction History', callback_data: 'wallet_history' }
                        ],
                        [
                            { text: '⬅️ Back', callback_data: 'main_menu' }
                        ]
                    ]
                }
            };

            let message = '💰 <b>Your Wallet</b>\n\n';
            message += `🪙 <b>Balance:</b> $${walletData.balance.toFixed(2)}\n`;
            message += `⭐ <b>Stars:</b> ${walletData.starBalance}\n`;

            await ctx.replyWithHTML(message, keyboard);
        } catch (error) {
            logger.error('Wallet main menu error', error, { userId: ctx.user?.id });
            await ctx.reply('❌ <b>Error loading wallet</b>\n\nPlease try again.', {
                parse_mode: 'HTML'
            });
        }
    },

    // Show deposit menu
    async showDepositMenu(ctx) {
        try {
            const keyboard = {
                reply_markup: {
                    inline_keyboard: [
                        [
                            { text: '💵 $5', callback_data: 'wallet_deposit_5' },
                            { text: '💵 $10', callback_data: 'wallet_deposit_10' },
                            { text: '💵 $25', callback_data: 'wallet_deposit_25' }
                        ],
                        [
                            { text: '⬅️ Back', callback_data: 'wallet_main' }
                        ]
                    ]
                }
            };

            let message = '➕ <b>Deposit Funds</b>\n\n';
            message += 'Choose an amount to deposit via Telegram Payments:';

            await ctx.editMessageText(message, { ...keyboard, parse_mode: 'HTML' });
        } catch (error) {
            logger.error('Deposit menu error', error, { userId: ctx.user?.id });
            await ctx.reply('❌ <b>Error loading deposit menu</b>\n\nPlease try again.', {
                parse_mode: 'HTML'
            });
        }
    },

    // Process deposit (generates Telegram payment invoice)
    async processDeposit(ctx, amount) {
        try {
            const invoiceData = {
                title: 'Wallet Deposit',
                description: `Deposit $${amount} to your wallet`,
                payload: `deposit_${ctx.user._id}_${Date.now()}`,
                provider_token: process.env.TELEGRAM_PAYMENT_TOKEN,
                currency: 'USD',
                prices: [{ label: 'Deposit', amount: amount * 100 }]
            };
            await ctx.replyWithInvoice(invoiceData);
        } catch (error) {
            logger.error('Deposit invoice error', error, { userId: ctx.user?.id, amount });
            await ctx.reply('❌ <b>Error creating deposit invoice</b>\n\nPlease try again.', {
                parse_mode: 'HTML'
            });
        }
    },

    // Show stars purchase menu
    async showStarsMenu(ctx) {
        try {
            const keyboard = {
                reply_markup: {
                    inline_keyboard: [
                        [
                            { text: '⭐ 100 Stars', callback_data: 'wallet_stars_100' },
                            { text: '⭐ 500 Stars', callback_data: 'wallet_stars_500' }
                        ],
                        [
                            { text: '⬅️ Back', callback_data: 'wallet_main' }
                        ]
                    ]
                }
            };

            let message = '⭐ <b>Buy Telegram Stars</b>\n\n';
            message += 'Choose the amount of Stars to purchase:';

            await ctx.editMessageText(message, { ...keyboard, parse_mode: 'HTML' });
        } catch (error) {
            logger.error('Stars menu error', error, { userId: ctx.user?.id });
            await ctx.reply('❌ <b>Error loading Stars menu</b>\n\nPlease try again.', {
                parse_mode: 'HTML'
            });
        }
    },

    // Process Stars purchase (Telegram Stars invoice)
    async processStarsPurchase(ctx, starsAmount) {
        try {
            const invoiceData = {
                title: 'Buy Stars',
                description: `Purchase ${starsAmount} Telegram Stars`,
                payload: `stars_${ctx.user._id}_${Date.now()}`,
                provider_token: process.env.TELEGRAM_PAYMENT_TOKEN,
                currency: 'XTR',
                prices: [{ label: 'Stars', amount: starsAmount }]
            };
            await ctx.replyWithInvoice(invoiceData);
        } catch (error) {
            logger.error('Stars invoice error', error, { userId: ctx.user?.id, starsAmount });
            await ctx.reply('❌ <b>Error creating Stars invoice</b>\n\nPlease try again.', {
                parse_mode: 'HTML'
            });
        }
    },

    // Show transaction history
    async showTransactionHistory(ctx, page = 1) {
        try {
            const walletData = await db.Wallet.findOne({ user: ctx.user._id });
            if (!walletData || !walletData.transactions || walletData.transactions.length === 0) {
                await ctx.replyWithHTML('🕑 <b>No transactions found.</b>');
                return;
            }

            const transactions = walletData.transactions.slice(-20).reverse(); // Show latest 20
            let message = '🕑 <b>Transaction History</b>\n\n';

            transactions.forEach((tx, idx) => {
                message += `#${idx + 1} — <b>${tx.type}</b> — $${tx.amount} ${tx.currency}\n`;
                message += `📝 ${tx.description || tx.type.replace(/_/g, ' ')}\n`;
                message += `⏰ ${new Date(tx.createdAt).toLocaleDateString()}\n\n`;
            });

            const keyboard = {
                reply_markup: {
                    inline_keyboard: [
                        [
                            { text: '🔄 Refresh', callback_data: 'wallet_history' },
                            { text: '⬅️ Back', callback_data: 'wallet_main' }
                        ]
                    ]
                }
            };

            await ctx.replyWithHTML(message, keyboard);

        } catch (error) {
            logger.error('Transaction history error', error, { userId: ctx.user?.id, page });
            await ctx.reply('❌ <b>Error loading transaction history</b>\n\nPlease try again.', {
                parse_mode: 'HTML'
            });
        }
    },

    // Process Telegram payment callback
    async processTelegramPayment(paymentData) {
        try {
            // Find user wallet
            const userId = paymentData.from.id || paymentData.from;
            const walletData = await db.Wallet.findOne({ user: userId });
            if (!walletData) return { success: false };

            // Determine payment type from payload
            let paymentType = '';
            let amount = paymentData.total_amount / 100;
            let currency = paymentData.currency;

            if (paymentData.invoice_payload.startsWith('deposit_')) {
                paymentType = 'deposit';
                walletData.balance += amount;
            } else if (paymentData.invoice_payload.startsWith('stars_')) {
                paymentType = 'stars_deposit';
                walletData.starBalance += amount;
            }

            // Save transaction
            walletData.transactions.push({
                id: paymentData.telegram_payment_charge_id,
                type: paymentType,
                amount,
                currency,
                status: 'completed',
                paymentId: paymentData.telegram_payment_charge_id,
                description: `Telegram payment`,
                createdAt: new Date()
            });

            await walletData.save();
            return { success: true };
        } catch (error) {
            logger.error('Telegram payment processing error', error, { paymentData });
            return { success: false };
        }
    }
};

module.exports = wallet;