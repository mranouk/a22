require('dotenv').config();
const mongoose = require('mongoose');
const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const config = require('config');

// Initialize services
const logger = require('./utils/logger');
const cryptoUtils = require('./utils/cryptoUtils');
const walletService = require('./services/walletService');
const bot = require('./bot');

class Application {
    constructor() {
        this.app = express();
        this.server = null;
        this.initialized = false;
    }

    async initialize() {
        try {
            logger.info('Starting Telegram Marketplace Bot...');

            // Initialize database
            await this.connectDatabase();

            // Initialize crypto utils
            await cryptoUtils.initialize();

            // Setup Express app for webhooks
            this.setupExpress();

            // Initialize Telegram bot
            await bot.initialize();

            // Setup payment webhooks
            this.setupPaymentWebhooks();

            // Setup graceful shutdown
            this.setupGracefulShutdown();

            this.initialized = true;
            logger.info('Application initialized successfully');

        } catch (error) {
            logger.error('Failed to initialize application', error);
            throw error;
        }
    }

    async connectDatabase() {
        try {
            const dbUri = config.get('database.uri');
            const dbOptions = config.get('database.options');

            await mongoose.connect(dbUri, dbOptions);
            
            mongoose.connection.on('connected', () => {
                logger.info('Database connected successfully');
            });

            mongoose.connection.on('error', (error) => {
                logger.error('Database connection error', error);
            });

            mongoose.connection.on('disconnected', () => {
                logger.warn('Database disconnected');
            });

        } catch (error) {
            logger.error('Failed to connect to database', error);
            throw error;
        }
    }

    setupExpress() {
        try {
            // Security middleware
            this.app.use(helmet());
            this.app.use(cors());

            // Body parsing middleware
            this.app.use(express.json({ limit: '10mb' }));
            this.app.use(express.urlencoded({ extended: true, limit: '10mb' }));

            // Health check endpoint
            this.app.get('/health', (req, res) => {
                res.json({
                    status: 'ok',
                    timestamp: new Date().toISOString(),
                    version: require('../package.json').version
                });
            });

            // Bot webhook endpoint (for production)
            this.app.post('/webhook', (req, res) => {
                try {
                    bot.bot.handleUpdate(req.body);
                    res.status(200).send('OK');
                } catch (error) {
                    logger.error('Webhook error', error);
                    res.status(500).send('Error');
                }
            });

            logger.info('Express app configured');

        } catch (error) {
            logger.error('Failed to setup Express app', error);
            throw error;
        }
    }

    setupPaymentWebhooks() {
        try {
            // Telegram payment webhooks
            this.app.post('/payment/success', async (req, res) => {
                try {
                    const paymentData = req.body;
                    logger.info('Payment success webhook received', { paymentData });

                    // Process the payment
                    const result = await walletService.processPayment(paymentData);
                    
                    if (result.success) {
                        logger.info('Payment processed successfully', { 
                            paymentId: paymentData.telegram_payment_charge_id,
                            amount: result.newBalance 
                        });
                        res.status(200).json({ status: 'success' });
                    } else {
                        logger.error('Payment processing failed', { paymentData });
                        res.status(400).json({ status: 'error', message: 'Payment processing failed' });
                    }

                } catch (error) {
                    logger.error('Payment webhook error', error);
                    res.status(500).json({ status: 'error', message: 'Internal server error' });
                }
            });

            // Pre-checkout query handler (validation before payment)
            this.app.post('/payment/pre-checkout', async (req, res) => {
                try {
                    const { id, from, currency, total_amount, invoice_payload } = req.body;
                    
                    // Validate the payment request
                    const validation = cryptoUtils.validateTelegramPayment({
                        invoice_payload,
                        total_amount,
                        currency
                    });

                    if (validation.valid) {
                        res.status(200).json({ ok: true });
                    } else {
                        res.status(200).json({ 
                            ok: false, 
                            error_message: validation.error 
                        });
                    }

                } catch (error) {
                    logger.error('Pre-checkout error', error);
                    res.status(200).json({ 
                        ok: false, 
                        error_message: 'Payment validation failed' 
                    });
                }
            });

            logger.info('Payment webhooks configured');

        } catch (error) {
            logger.error('Failed to setup payment webhooks', error);
            throw error;
        }
    }

    setupGracefulShutdown() {
        const shutdown = async (signal) => {
            logger.info(`Received ${signal}, shutting down gracefully...`);

            try {
                // Stop accepting new requests
                if (this.server) {
                    this.server.close(() => {
                        logger.info('HTTP server closed');
                    });
                }

                // Stop the bot
                await bot.stop();

                // Close database connection
                await mongoose.connection.close();
                logger.info('Database connection closed');

                logger.info('Shutdown complete');
                process.exit(0);

            } catch (error) {
                logger.error('Error during shutdown', error);
                process.exit(1);
            }
        };

        // Handle different shutdown signals
        process.on('SIGTERM', () => shutdown('SIGTERM'));
        process.on('SIGINT', () => shutdown('SIGINT'));
        process.on('SIGUSR2', () => shutdown('SIGUSR2')); // For nodemon

        // Handle uncaught exceptions
        process.on('uncaughtException', (error) => {
            logger.error('Uncaught Exception', error);
            shutdown('uncaughtException');
        });

        process.on('unhandledRejection', (reason, promise) => {
            logger.error('Unhandled Rejection', reason, { promise });
            shutdown('unhandledRejection');
        });
    }

    async start() {
        try {
            if (!this.initialized) {
                await this.initialize();
            }

            const port = process.env.PORT || 3000;

            // Start HTTP server
            this.server = this.app.listen(port, () => {
                logger.info(`Server listening on port ${port}`);
            });

            // Start Telegram bot
            await bot.start();

            // Enable graceful stop for bot
            bot.enableGracefulStop();

            logger.info('🚀 Telegram Marketplace Bot is running!');
            logger.info('📱 Users can now interact with the bot');
            logger.info('💳 Payment webhooks are active');
            logger.info('🔧 Health check available at /health');

        } catch (error) {
            logger.error('Failed to start application', error);
            throw error;
        }
    }
}

// Create and export application instance
const app = new Application();

// Start the application if this file is run directly
if (require.main === module) {
    app.start().catch((error) => {
        logger.error('Failed to start application', error);
        process.exit(1);
    });
}

module.exports = app;
