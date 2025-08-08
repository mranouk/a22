const { templates } = require('../ui/templates');
const { keyboards } = require('../ui/keyboards');
const config = require('../config');
const { utils } = require('../utils');
const { onboarding } = require('./onboarding');

const wallet = {
    // Handle wallet actions
    async handleAction(ctx) {
        const action = ctx.match[1]; // Everything after "wallet."
        const [actionType, ...params] = action.split('.');

        switch (actionType) {
            case 'open':
                return wallet.showWallet(ctx);
            case 'deposit':
                return wallet.handleDeposit(ctx, params);
            case 'withdraw':
                return wallet.handleWithdraw(ctx, params);
            case 'history':
                return wallet.showHistory(ctx, params);
            default:
                return ctx.answerCbQuery('⚠️ Wallet action not found');
        }
    },

    // Show wallet dashboard
    async showWallet(ctx) {
        const access = onboarding.checkUserAccess(ctx);
        if (!access.allowed) {
            return ctx.replyWithHTML(templates.error(access.reason));
        }

        const userId = ctx.from.id;
        const userData = config.mockData.users.get(userId);

        // Mock wallet balance (in a real implementation, this would come from the database)
        const balance = userData.walletBalance || 0;
        const pendingEscrow = userData.pendingEscrow || 0;

        let walletText = `💸 <b>Your Wallet</b>\n\n`;
        walletText += `💰 <b>Available Balance:</b> ${utils.formatStars(balance)}\n`;
        if (pendingEscrow > 0) {
            walletText += `🛡️ <b>In Escrow:</b> ${utils.formatStars(pendingEscrow)}\n`;
        }
        walletText += `\n📊 <b>Quick Actions:</b>`;

        const keyboard = [
            [
                { text: '💰 Deposit Stars', callback_data: 'wallet.deposit.menu' },
                { text: '📤 Withdraw', callback_data: 'wallet.withdraw.menu' }
            ],
            [
                { text: '📄 Transaction History', callback_data: 'wallet.history.page:1' },
                { text: '🛡️ Escrow Center', callback_data: 'escrow.menu' }
            ],
            [{ text: '⬅️ Back to Menu', callback_data: 'user.home' }]
        ];

        if (ctx.callbackQuery) {
            return ctx.editMessageText(walletText, {
                parse_mode: 'HTML',
                reply_markup: { inline_keyboard: keyboard }
            });
        } else {
            return ctx.replyWithHTML(walletText, {
                reply_markup: { inline_keyboard: keyboard }
            });
        }
    },

    // Handle deposit via Telegram Stars
    async handleDeposit(ctx, params) {
        const action = params[0];

        if (action === 'menu') {
            const depositText = `💰 <b>Deposit Telegram Stars</b>\n\n` +
                              `Choose the amount you'd like to deposit:\n\n` +
                              `💡 <i>Stars are Telegram's internal currency</i>`;

            const keyboard = [
                [
                    { text: '⭐ 10 Stars', callback_data: 'wallet.deposit.amount:10' },
                    { text: '⭐ 25 Stars', callback_data: 'wallet.deposit.amount:25' }
                ],
                [
                    { text: '⭐ 50 Stars', callback_data: 'wallet.deposit.amount:50' },
                    { text: '⭐ 100 Stars', callback_data: 'wallet.deposit.amount:100' }
                ],
                [
                    { text: '⭐ 250 Stars', callback_data: 'wallet.deposit.amount:250' },
                    { text: '⭐ 500 Stars', callback_data: 'wallet.deposit.amount:500' }
                ],
                [{ text: '⬅️ Back to Wallet', callback_data: 'wallet.open' }]
            ];

            return ctx.editMessageText(depositText, {
                parse_mode: 'HTML',
                reply_markup: { inline_keyboard: keyboard }
            });
        }

        if (action === 'amount') {
            const amount = parseInt(params[1]);
            return wallet.createDepositInvoice(ctx, amount);
        }

        return ctx.answerCbQuery('⚠️ Invalid deposit action');
    },

    // Create Telegram Stars invoice
    async createDepositInvoice(ctx, amount) {
        try {
            const invoicePayload = JSON.stringify({
                type: 'deposit',
                amount: amount,
                userId: ctx.from.id
            });

            // Create invoice for Telegram Stars payment
            await ctx.replyWithInvoice({
                title: `Deposit ${amount} Stars`,
                description: `Add ${amount} Telegram Stars to your wallet balance`,
                payload: invoicePayload,
                provider_token: '', // Empty for Stars payments
                currency: 'XTR', // Telegram Stars currency code
                prices: [{ label: 'Stars', amount: amount }],
                photo_url: 'https://via.placeholder.com/512x512/4A90E2/FFFFFF?text=⭐',
                photo_width: 512,
                photo_height: 512,
                need_name: false,
                need_phone_number: false,
                need_email: false,
                need_shipping_address: false,
                send_phone_number_to_provider: false,
                send_email_to_provider: false,
                is_flexible: false
            });

            await ctx.answerCbQuery('💳 Invoice created! Complete the payment to add Stars.');

        } catch (error) {
            console.error('Invoice creation error:', error);
            return ctx.answerCbQuery('⚠️ Failed to create invoice. Please try again.', { show_alert: true });
        }
    },

    // Handle withdraw (simplified)
    async handleWithdraw(ctx, params) {
        const withdrawText = `📤 <b>Withdraw Funds</b>\n\n` +
                           `<i>Withdrawal functionality depends on Telegram's capabilities.</i>\n\n` +
                           `Currently, Stars can be used within the Telegram ecosystem.`;

        return ctx.editMessageText(withdrawText, {
            parse_mode: 'HTML',
            reply_markup: keyboards.backButton('wallet.open')
        });
    },

    // Show transaction history
    async showHistory(ctx, params) {
        const page = parseInt(params[0]?.split(':')[1] || '1');
        const userId = ctx.from.id;

        // Mock transaction history
        const mockTransactions = [
            {
                id: 'tx_1',
                type: 'deposit',
                amount: 100,
                status: 'completed',
                date: new Date('2024-01-15T10:30:00'),
                description: 'Wallet deposit'
            },
            {
                id: 'tx_2', 
                type: 'payment',
                amount: -50,
                status: 'completed',
                date: new Date('2024-01-14T15:45:00'),
                description: 'Premium subscription'
            },
            {
                id: 'tx_3',
                type: 'escrow',
                amount: -25,
                status: 'pending',
                date: new Date('2024-01-13T09:20:00'),
                description: 'Escrow deal #ESC_123'
            }
        ];

        const itemsPerPage = 5;
        const totalPages = Math.ceil(mockTransactions.length / itemsPerPage);
        const startIndex = (page - 1) * itemsPerPage;
        const pageTransactions = mockTransactions.slice(startIndex, startIndex + itemsPerPage);

        let historyText = `📄 <b>Transaction History</b> (Page ${page}/${totalPages})\n\n`;

        if (pageTransactions.length === 0) {
            historyText += '📭 <i>No transactions found</i>';
        } else {
            pageTransactions.forEach((tx, index) => {
                const statusIcon = tx.status === 'completed' ? '✅' : '⏳';
                const amountColor = tx.amount > 0 ? '+' : '';
                const typeIcon = {
                    'deposit': '💰',
                    'payment': '💳',
                    'escrow': '🛡️',
                    'refund': '↩️'
                }[tx.type] || '💸';

                historyText += `${statusIcon} ${typeIcon} <b>${tx.description}</b>\n`;
                historyText += `Amount: ${amountColor}${utils.formatStars(Math.abs(tx.amount))}\n`;
                historyText += `Date: ${utils.formatDate(tx.date)}\n`;
                historyText += `Status: ${tx.status}\n\n`;
            });
        }

        const keyboard = [];

        // Pagination
        if (totalPages > 1) {
            keyboard.push(...keyboards.pagination(page, totalPages, 'wallet.history.page'));
        }

        // Back button
        keyboard.push([{ text: '⬅️ Back to Wallet', callback_data: 'wallet.open' }]);

        return ctx.editMessageText(historyText, {
            parse_mode: 'HTML',
            reply_markup: { inline_keyboard: keyboard }
        });
    },

    // Handle escrow actions
    async handleEscrowAction(ctx) {
        const action = ctx.match[1]; // Everything after "escrow."
        const [actionType, ...params] = action.split('.');

        switch (actionType) {
            case 'menu':
                return wallet.showEscrowMenu(ctx);
            case 'create':
                return wallet.createEscrowDeal(ctx, params);
            case 'fund':
                return wallet.fundEscrow(ctx, params);
            case 'release':
                return wallet.releaseEscrow(ctx, params);
            default:
                return ctx.answerCbQuery('⚠️ Escrow action not found');
        }
    },

    // Show escrow center
    async showEscrowMenu(ctx) {
        const escrowText = `🛡️ <b>Escrow Center</b>\n\n` +
                          `Secure transactions between buyers and sellers.\n\n` +
                          `📋 <b>How it works:</b>\n` +
                          `1. Create an escrow deal\n` +
                          `2. Buyer funds the escrow\n` +
                          `3. Seller delivers the service\n` +
                          `4. Buyer confirms and funds are released`;

        const keyboard = [
            [{ text: '➕ Create New Deal', callback_data: 'escrow.create.start' }],
            [{ text: '📋 My Deals', callback_data: 'escrow.list' }],
            [{ text: '⬅️ Back to Wallet', callback_data: 'wallet.open' }]
        ];

        return ctx.editMessageText(escrowText, {
            parse_mode: 'HTML',
            reply_markup: { inline_keyboard: keyboard }
        });
    },

    // Create escrow deal (simplified)
    async createEscrowDeal(ctx, params) {
        const dealId = utils.generateId('ESC');
        const mockDeal = {
            id: dealId,
            buyer: ctx.from.id,
            seller: null, // Would be selected in a full implementation
            amount: 100, // Mock amount
            status: 'created',
            createdAt: new Date(),
            description: 'Sample escrow deal'
        };

        config.mockData.escrowDeals.set(dealId, mockDeal);

        const dealText = templates.escrowCreated(dealId, mockDeal.amount);

        return ctx.editMessageText(dealText, {
            parse_mode: 'HTML',
            reply_markup: keyboards.backButton('escrow.menu')
        });
    },

    // Handle successful payment (called from router)
    async handleSuccessfulPayment(ctx, payment, payload) {
        const userId = ctx.from.id;
        const userData = config.mockData.users.get(userId);

        if (!userData) return;

        // Update wallet balance
        const amount = payment.total_amount; // Already in Stars
        userData.walletBalance = (userData.walletBalance || 0) + amount;
        config.mockData.users.set(userId, userData);

        return ctx.replyWithHTML(
            templates.paymentSuccess(amount) + 
            `\n\n💰 <b>New Balance:</b> ${utils.formatStars(userData.walletBalance)}`,
            {
                reply_markup: keyboards.backButton('wallet.open')
            }
        );
    }
};

module.exports = { wallet };
