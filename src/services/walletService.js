// src/services/walletService.js
const Wallet = require('../models/wallet');
const User = require('../models/user');
const cryptoUtils = require('../utils/cryptoUtils');
const notificationService = require('./notificationService');
const logger = require('../utils/logger');
const { v4: uuidv4 } = require('uuid');

class WalletService {
    // Get or create wallet for user (simplified for Telegram payments)
    async getOrCreateWallet(userId) {
        try {
            let wallet = await Wallet.findOne({ user: userId });
            
            if (!wallet) {
                wallet = await Wallet.create({
                    user: userId,
                    balance: 0, // USD balance for internal accounting
                    starBalance: 0, // Telegram Stars balance
                    escrowBalance: 0, // Funds held in escrow
                    transactions: [],
                    pendingPayments: [],
                    status: 'active'
                });
                
                logger.info(`Created new wallet for user ${userId}`);
            }
            
            return wallet;
        } catch (error) {
            logger.error('Failed to get or create wallet', error, { userId });
            throw new Error('Wallet service error');
        }
    }

    // Get wallet by user ID
    async getWallet(userId) {
        try {
            const wallet = await this.getOrCreateWallet(userId);
            return {
                balance: wallet.balance || 0,
                starBalance: wallet.starBalance || 0,
                escrowBalance: wallet.escrowBalance || 0,
                totalBalance: (wallet.balance || 0) + (wallet.escrowBalance || 0),
                currency: 'USD',
                status: wallet.status || 'active'
            };
        } catch (error) {
            logger.error('Failed to get wallet', error, { userId });
            throw error;
        }
    }

    // Create payment invoice for deposit
    async createDepositInvoice(userId, amount, description = 'Wallet Deposit') {
        try {
            const user = await User.findById(userId);
            if (!user) {
                throw new Error('User not found');
            }

            // Log payment attempt
            cryptoUtils.logPaymentAttempt(userId, amount, 'deposit', 'wallet_deposit');

            // Create Telegram invoice
            const invoice = cryptoUtils.generateInvoice(
                amount,
                description,
                `deposit:${userId}:${Date.now()}`
            );

            // Store pending payment
            const wallet = await this.getOrCreateWallet(userId);
            wallet.pendingPayments.push({
                id: uuidv4(),
                type: 'deposit',
                amount,
                currency: 'USD',
                payload: invoice.payload,
                status: 'pending',
                createdAt: new Date(),
                expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000) // 24 hours
            });
            
            await wallet.save();

            return {
                success: true,
                invoice,
                paymentId: invoice.payload
            };
        } catch (error) {
            logger.error('Failed to create deposit invoice', error, { userId, amount });
            throw error;
        }
    }

    // Create Stars deposit invoice for premium features
    async createStarsDepositInvoice(userId, starsAmount, description = 'Stars Purchase') {
        try {
            const user = await User.findById(userId);
            if (!user) {
                throw new Error('User not found');
            }

            // Create Telegram Stars invoice
            const invoice = cryptoUtils.generateStarsInvoice(
                starsAmount,
                description,
                `stars:${userId}:${Date.now()}`
            );

            // Store pending payment
            const wallet = await this.getOrCreateWallet(userId);
            wallet.pendingPayments.push({
                id: uuidv4(),
                type: 'stars_deposit',
                amount: starsAmount,
                currency: 'XTR',
                payload: invoice.payload,
                status: 'pending',
                createdAt: new Date(),
                expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000)
            });
            
            await wallet.save();

            return {
                success: true,
                invoice,
                paymentId: invoice.payload
            };
        } catch (error) {
            logger.error('Failed to create stars deposit invoice', error, { userId, starsAmount });
            throw error;
        }
    }

    // Process successful Telegram payment
    async processPayment(paymentData) {
        try {
            const result = await cryptoUtils.processTelegramPayment(paymentData);
            
            if (!result.success) {
                throw new Error(result.error);
            }

            const payload = result.payload;
            const [type, userId, timestamp] = payload.split(':');

            const wallet = await this.getOrCreateWallet(userId);
            
            // Find pending payment
            const pendingPayment = wallet.pendingPayments.find(
                p => p.payload === payload && p.status === 'pending'
            );

            if (!pendingPayment) {
                throw new Error('Pending payment not found');
            }

            // Update balances based on payment type
            if (type === 'deposit') {
                wallet.balance += result.amount;
                
                // Add transaction record
                wallet.transactions.push({
                    id: uuidv4(),
                    type: 'deposit',
                    amount: result.amount,
                    currency: result.currency,
                    status: 'completed',
                    paymentId: result.paymentId,
                    description: 'Telegram Payment Deposit',
                    createdAt: new Date()
                });

            } else if (type === 'stars') {
                wallet.starBalance += result.amount;
                
                wallet.transactions.push({
                    id: uuidv4(),
                    type: 'stars_deposit',
                    amount: result.amount,
                    currency: 'XTR',
                    status: 'completed',
                    paymentId: result.paymentId,
                    description: 'Telegram Stars Purchase',
                    createdAt: new Date()
                });
            }

            // Mark pending payment as completed
            pendingPayment.status = 'completed';
            pendingPayment.completedAt = new Date();

            await wallet.save();

            // Log successful payment
            cryptoUtils.logPaymentSuccess(userId, result.paymentId, result.amount, type);

            // Send notification
            await notificationService.sendNotification(userId, {
                type: 'payment_success',
                title: '💰 Payment Successful',
                message: `Your ${type} of ${result.amount} ${result.currency} has been processed successfully.`,
                data: { paymentId: result.paymentId, amount: result.amount }
            });

            return {
                success: true,
                newBalance: wallet.balance,
                newStarBalance: wallet.starBalance,
                transaction: wallet.transactions[wallet.transactions.length - 1]
            };

        } catch (error) {
            logger.error('Failed to process payment', error, { paymentData });
            throw error;
        }
    }

    // Internal transfer between users (for marketplace transactions)
    async transferFunds(fromUserId, toUserId, amount, description = 'Internal Transfer') {
        try {
            const fromWallet = await this.getOrCreateWallet(fromUserId);
            const toWallet = await this.getOrCreateWallet(toUserId);

            // Check if sender has sufficient balance
            if (fromWallet.balance < amount) {
                throw new Error('Insufficient balance');
            }

            // Create transaction ID
            const transactionId = uuidv4();

            // Deduct from sender
            fromWallet.balance -= amount;
            fromWallet.transactions.push({
                id: transactionId,
                type: 'transfer_out',
                amount: -amount,
                currency: 'USD',
                status: 'completed',
                toUserId,
                description,
                createdAt: new Date()
            });

            // Add to receiver
            toWallet.balance += amount;
            toWallet.transactions.push({
                id: transactionId,
                type: 'transfer_in',
                amount: amount,
                currency: 'USD',
                status: 'completed',
                fromUserId,
                description,
                createdAt: new Date()
            });

            await fromWallet.save();
            await toWallet.save();

            // Send notifications
            await Promise.all([
                notificationService.sendNotification(fromUserId, {
                    type: 'transfer_sent',
                    title: '💸 Transfer Sent',
                    message: `You sent $${amount} - ${description}`,
                    data: { amount, toUserId, transactionId }
                }),
                notificationService.sendNotification(toUserId, {
                    type: 'transfer_received',
                    title: '💰 Payment Received',
                    message: `You received $${amount} - ${description}`,
                    data: { amount, fromUserId, transactionId }
                })
            ]);

            logger.audit('funds_transfer', fromUserId, {
                toUserId,
                amount,
                transactionId,
                description
            });

            return {
                success: true,
                transactionId,
                fromBalance: fromWallet.balance,
                toBalance: toWallet.balance
            };

        } catch (error) {
            logger.error('Failed to transfer funds', error, { fromUserId, toUserId, amount });
            throw error;
        }
    }

    // Create escrow for marketplace transactions
    async createEscrow(buyerId, sellerId, amount, description, orderId) {
        try {
            const buyerWallet = await this.getOrCreateWallet(buyerId);

            // Check if buyer has sufficient balance
            if (buyerWallet.balance < amount) {
                throw new Error('Insufficient balance for escrow');
            }

            const escrowId = cryptoUtils.generateEscrowId();

            // Move funds to escrow
            buyerWallet.balance -= amount;
            buyerWallet.escrowBalance += amount;

            buyerWallet.transactions.push({
                id: uuidv4(),
                type: 'escrow_created',
                amount: -amount,
                currency: 'USD',
                status: 'pending',
                escrowId,
                sellerId,
                orderId,
                description,
                createdAt: new Date()
            });

            await buyerWallet.save();

            // Send notifications
            await Promise.all([
                notificationService.sendNotification(buyerId, {
                    type: 'escrow_created',
                    title: '🛡️ Escrow Created',
                    message: `$${amount} secured in escrow for: ${description}`,
                    data: { escrowId, amount, sellerId }
                }),
                notificationService.sendNotification(sellerId, {
                    type: 'escrow_notification',
                    title: '💰 Payment Secured',
                    message: `Buyer has secured $${amount} in escrow for your item`,
                    data: { escrowId, amount, buyerId }
                })
            ]);

            logger.audit('escrow_created', buyerId, {
                escrowId,
                sellerId,
                amount,
                orderId
            });

            return {
                success: true,
                escrowId,
                amount,
                buyerBalance: buyerWallet.balance,
                escrowBalance: buyerWallet.escrowBalance
            };

        } catch (error) {
            logger.error('Failed to create escrow', error, { buyerId, sellerId, amount });
            throw error;
        }
    }

    // Release escrow funds to seller
    async releaseEscrow(escrowId, buyerId, sellerId, amount) {
        try {
            const buyerWallet = await this.getOrCreateWallet(buyerId);
            const sellerWallet = await this.getOrCreateWallet(sellerId);

            // Check escrow balance
            if (buyerWallet.escrowBalance < amount) {
                throw new Error('Insufficient escrow balance');
            }

            const transactionId = uuidv4();

            // Release from buyer's escrow to seller's balance
            buyerWallet.escrowBalance -= amount;
            sellerWallet.balance += amount;

            // Add transaction records
            buyerWallet.transactions.push({
                id: transactionId,
                type: 'escrow_released',
                amount: -amount,
                currency: 'USD',
                status: 'completed',
                escrowId,
                sellerId,
                description: 'Escrow funds released to seller',
                createdAt: new Date()
            });

            sellerWallet.transactions.push({
                id: transactionId,
                type: 'escrow_received',
                amount: amount,
                currency: 'USD',
                status: 'completed',
                escrowId,
                buyerId,
                description: 'Escrow funds received from buyer',
                createdAt: new Date()
            });

            await buyerWallet.save();
            await sellerWallet.save();

            // Send notifications
            await Promise.all([
                notificationService.sendNotification(buyerId, {
                    type: 'escrow_released',
                    title: '✅ Escrow Released',
                    message: `$${amount} released to seller`,
                    data: { escrowId, amount, sellerId }
                }),
                notificationService.sendNotification(sellerId, {
                    type: 'payment_received',
                    title: '💰 Payment Received',
                    message: `You received $${amount} from escrow`,
                    data: { escrowId, amount, buyerId }
                })
            ]);

            logger.audit('escrow_released', buyerId, {
                escrowId,
                sellerId,
                amount,
                transactionId
            });

            return {
                success: true,
                transactionId,
                buyerEscrowBalance: buyerWallet.escrowBalance,
                sellerBalance: sellerWallet.balance
            };

        } catch (error) {
            logger.error('Failed to release escrow', error, { escrowId, buyerId, sellerId, amount });
            throw error;
        }
    }

    // Check if user has sufficient balance
    async hasBalance(userId, amount) {
        try {
            const wallet = await this.getOrCreateWallet(userId);
            return wallet.balance >= amount;
        } catch (error) {
            logger.error('Failed to check balance', error, { userId, amount });
            return false;
        }
    }

    // Get transaction history
    async getTransactionHistory(userId, limit = 50, offset = 0) {
        try {
            const wallet = await this.getOrCreateWallet(userId);
            
            const transactions = wallet.transactions
                .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
                .slice(offset, offset + limit);

            return {
                transactions,
                total: wallet.transactions.length,
                hasMore: wallet.transactions.length > offset + limit
            };

        } catch (error) {
            logger.error('Failed to get transaction history', error, { userId });
            throw error;
        }
    }

    // Cancel pending payment
    async cancelPendingPayment(userId, paymentId) {
        try {
            const wallet = await this.getOrCreateWallet(userId);
            
            const payment = wallet.pendingPayments.find(
                p => p.payload === paymentId && p.status === 'pending'
            );

            if (!payment) {
                throw new Error('Pending payment not found');
            }

            payment.status = 'cancelled';
            payment.cancelledAt = new Date();

            await wallet.save();

            return { success: true };

        } catch (error) {
            logger.error('Failed to cancel pending payment', error, { userId, paymentId });
            throw error;
        }
    }

    // Request withdrawal (for user or system)
    async requestWithdrawal(userId, { amount, currency = 'USDT', to }) {
        try {
            const wallet = await this.getOrCreateWallet(userId);
            if (wallet.balance < amount) {
                throw new Error('Insufficient balance');
            }
            wallet.balance -= amount;
            wallet.transactions.push({
                id: uuidv4(),
                type: 'withdrawal',
                amount: -amount,
                currency,
                status: 'pending',
                to,
                description: to === 'system-boost' ? 'Boost purchase' : `Withdrawal to ${to}`,
                createdAt: new Date()
            });
            await wallet.save();
            // Notify user
            await notificationService.sendNotification(userId, {
                type: 'withdrawal',
                title: '💸 Withdrawal Requested',
                message: `Your withdrawal of ${amount} ${currency} to ${to} is being processed.`
            });
            return { success: true };
        } catch (error) {
            logger.error('Failed to request withdrawal', error, { userId, amount, to });
            throw error;
        }
    }
}

module.exports = new WalletService();

