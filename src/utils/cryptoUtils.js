const crypto = require('crypto');
const logger = require('./logger');

class CryptoUtils {
    constructor() {
        this.initialized = true; // No external setup needed for Telegram wallet
    }

    async initialize() {
        // No external initialization needed for Telegram wallet
        logger.info('CryptoUtils initialized for Telegram wallet system');
        return true;
    }

    // Generate invoice for Telegram payments
    generateInvoice(amount, description, payload = null) {
        const invoiceData = {
            title: 'Marketplace Payment',
            description: description,
            payload: payload || this.generatePaymentReference(),
            provider_token: process.env.TELEGRAM_PAYMENT_TOKEN || '',
            currency: 'USD',
            prices: [
                {
                    label: description,
                    amount: Math.round(amount * 100) // Telegram expects amount in cents
                }
            ],
            need_name: false,
            need_phone_number: false,
            need_email: false,
            need_shipping_address: false,
            send_phone_number_to_provider: false,
            send_email_to_provider: false,
            is_flexible: false
        };

        return invoiceData;
    }

    // Generate Telegram Stars invoice for in-app purchases
    generateStarsInvoice(amount, description, payload = null) {
        const invoiceData = {
            title: 'Marketplace Payment',
            description: description,
            payload: payload || this.generatePaymentReference(),
            currency: 'XTR', // Telegram Stars currency
            prices: [
                {
                    label: description,
                    amount: Math.round(amount) // Stars are whole numbers
                }
            ]
        };

        return invoiceData;
    }

    // Create escrow using Telegram wallet balance
    async createEscrow(buyerTelegramId, sellerTelegramId, amount, description) {
        try {
            const escrowId = this.generateEscrowId();
            
            return {
                escrowId,
                buyerTelegramId,
                sellerTelegramId,
                amount,
                description,
                status: 'created',
                paymentMethod: 'telegram_wallet',
                createdAt: new Date()
            };
        } catch (error) {
            logger.error('Failed to create Telegram escrow', error);
            throw error;
        }
    }

    // Generate payment reference for tracking
    generatePaymentReference() {
        return 'PAY-' + crypto.randomBytes(8).toString('hex').toUpperCase();
    }

    // Generate escrow ID
    generateEscrowId() {
        return 'ESC-' + crypto.randomBytes(16).toString('hex').toUpperCase();
    }

    // Validate Telegram payment
    validateTelegramPayment(paymentData) {
        try {
            // Basic validation for Telegram payment structure
            const required = ['invoice_payload', 'total_amount', 'currency'];
            
            for (const field of required) {
                if (!paymentData[field]) {
                    return { valid: false, error: `Missing required field: ${field}` };
                }
            }

            // Validate currency
            const supportedCurrencies = ['USD', 'EUR', 'XTR']; // XTR = Telegram Stars
            if (!supportedCurrencies.includes(paymentData.currency)) {
                return { valid: false, error: 'Unsupported currency' };
            }

            // Validate amount is positive
            if (paymentData.total_amount <= 0) {
                return { valid: false, error: 'Invalid amount' };
            }

            return { valid: true };
        } catch (error) {
            logger.error('Payment validation error', error);
            return { valid: false, error: 'Validation failed' };
        }
    }

    // Process Telegram payment callback
    async processTelegramPayment(paymentData) {
        try {
            const validation = this.validateTelegramPayment(paymentData);
            if (!validation.valid) {
                throw new Error(validation.error);
            }

            const result = {
                success: true,
                paymentId: paymentData.telegram_payment_charge_id,
                amount: paymentData.total_amount / 100, // Convert from cents
                currency: paymentData.currency,
                payload: paymentData.invoice_payload,
                providerPaymentChargeId: paymentData.provider_payment_charge_id,
                processedAt: new Date()
            };

            logger.audit('telegram_payment_processed', null, result);
            return result;

        } catch (error) {
            logger.error('Failed to process Telegram payment', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    // Create refund request for Telegram payment
    async createRefundRequest(paymentId, amount, reason) {
        try {
            const refundId = 'REF-' + crypto.randomBytes(8).toString('hex').toUpperCase();
            
            return {
                refundId,
                paymentId,
                amount,
                reason,
                status: 'pending',
                createdAt: new Date()
            };
        } catch (error) {
            logger.error('Failed to create refund request', error);
            throw error;
        }
    }

    // Price conversion helpers (for display purposes)
    async convertToUSD(amount, fromCurrency) {
        // Mock conversion rates - in production, use real exchange rates
        const mockRates = {
            XTR: 0.1, // 1 Telegram Star = $0.10
            EUR: 1.1,
            USD: 1
        };

        const rate = mockRates[fromCurrency] || 1;
        return parseFloat(amount) * rate;
    }

    async convertFromUSD(usdAmount, toCurrency) {
        const mockRates = {
            XTR: 10, // $1 = 10 Telegram Stars
            EUR: 0.9,
            USD: 1
        };

        const rate = mockRates[toCurrency] || 1;
        return parseFloat(usdAmount) * rate;
    }

    // Convert USD to Telegram Stars for in-app purchases
    usdToStars(usdAmount) {
        return Math.ceil(usdAmount * 10); // $1 = 10 stars (rounded up)
    }

    // Convert Telegram Stars to USD
    starsToUsd(starsAmount) {
        return starsAmount * 0.1; // 10 stars = $1
    }

    // Generate payment verification hash
    generatePaymentHash(payload, amount, currency) {
        const data = `${payload}:${amount}:${currency}:${process.env.BOT_TOKEN}`;
        return crypto.createHash('sha256').update(data).digest('hex');
    }

    // Verify payment hash
    verifyPaymentHash(payload, amount, currency, receivedHash) {
        const expectedHash = this.generatePaymentHash(payload, amount, currency);
        return expectedHash === receivedHash;
    }

    // Create subscription invoice for premium features
    generateSubscriptionInvoice(planName, monthlyPrice, description) {
        return {
            title: `Premium Subscription - ${planName}`,
            description: description,
            payload: `subscription:${planName}:${Date.now()}`,
            provider_token: process.env.TELEGRAM_PAYMENT_TOKEN || '',
            currency: 'USD',
            prices: [
                {
                    label: `${planName} Monthly`,
                    amount: Math.round(monthlyPrice * 100)
                }
            ],
            need_name: false,
            need_phone_number: false,
            need_email: false,
            need_shipping_address: false,
            send_phone_number_to_provider: false,
            send_email_to_provider: false,
            is_flexible: false
        };
    }

    // Generate boost payment invoice
    generateBoostInvoice(boostType, price, duration) {
        return {
            title: `Boost Purchase - ${boostType}`,
            description: `${boostType} boost for ${duration} hours`,
            payload: `boost:${boostType}:${Date.now()}`,
            provider_token: process.env.TELEGRAM_PAYMENT_TOKEN || '',
            currency: 'USD',
            prices: [
                {
                    label: `${boostType} Boost`,
                    amount: Math.round(price * 100)
                }
            ],
            need_name: false,
            need_phone_number: false,
            need_email: false,
            need_shipping_address: false,
            send_phone_number_to_provider: false,
            send_email_to_provider: false,
            is_flexible: false
        };
    }

    // Check if user can make payments (basic validation)
    canMakePayments(userProfile) {
        // Basic checks for payment eligibility
        return {
            canPay: true,
            restrictions: [],
            // Add more sophisticated checks here if needed
            trustScoreRequired: userProfile.trustScore >= 50,
            accountAgeRequired: true // Could add age checks
        };
    }

    // Log payment attempt for audit
    logPaymentAttempt(userId, amount, type, payload) {
        logger.audit('payment_attempt', userId, {
            amount,
            type,
            payload,
            timestamp: new Date().toISOString()
        });
    }

    // Log successful payment
    logPaymentSuccess(userId, paymentId, amount, type) {
        logger.audit('payment_success', userId, {
            paymentId,
            amount,
            type,
            timestamp: new Date().toISOString()
        });
    }

    // Create digital product invoice (for services/digital goods)
    generateDigitalProductInvoice(productName, price, description, sellerInfo) {
        return {
            title: productName,
            description: description,
            payload: `product:${Date.now()}:${sellerInfo.userId}`,
            provider_token: process.env.TELEGRAM_PAYMENT_TOKEN || '',
            currency: 'USD',
            prices: [
                {
                    label: productName,
                    amount: Math.round(price * 100)
                }
            ],
            need_name: false,
            need_phone_number: false,
            need_email: false,
            need_shipping_address: false,
            send_phone_number_to_provider: false,
            send_email_to_provider: false,
            is_flexible: false
        };
    }
}

module.exports = new CryptoUtils();
