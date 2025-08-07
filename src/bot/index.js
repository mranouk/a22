const { Telegraf, Scenes, session } = require('telegraf');
const config = require('config');
const logger = require('../utils/logger');
const cryptoUtils = require('../utils/cryptoUtils');
const walletService = require('../services/walletService');

// Middlewares
const auth = require('./middlewares/auth');
const rateLimitMiddleware = require('./middlewares/rateLimiter');
const roleGuard = require('./middlewares/roleGuard');

// Commands
const startCommand = require('./commands/start');
const roleCommand = require('./commands/role');
const profileCommand = require('./commands/profile');
const marketplaceCommand = require('./commands/marketplace');
const walletCommand = require('./commands/wallet');
const boostCommand = require('./commands/boost');
const referralCommand = require('./commands/referral');

// Admin commands
const adminApprove = require('./commands/admin/approve');
const adminBroadcast = require('./commands/admin/broadcast');
const adminRequests = require('./commands/admin/requests');

// Handlers
const approvalHandler = require('./handlers/approvalHandler');
const roleSelectHandler = require('./handlers/roleSelectHandler');
const notificationsHandler = require('./handlers/notificationsHandler');

// Scenes
const scenes = require('./scenes');

class TelegramBot {
    constructor() {
        this.bot = null;
        this.stage = null;
        this.initialized = false;
    }

    async initialize() {
        try {
            // Create bot instance
            this.bot = new Telegraf(config.get('telegram.token'));

            // Create scene stage
            this.stage = new Scenes.Stage();
            
            // Register scenes
            this.registerScenes();
            
            // Setup middlewares
            this.setupMiddlewares();
            
            // Setup commands
            this.setupCommands();
            
            // Setup callback query handlers
            this.setupCallbackHandlers();
            
            // Setup error handling
            this.setupErrorHandling();

            this.initialized = true;
            logger.info('Telegram bot initialized successfully');
        } catch (error) {
            logger.error('Failed to initialize Telegram bot', error);
            throw error;
        }
    }

    registerScenes() {
        try {
            // Register all scenes from scenes directory
            Object.values(scenes).forEach(scene => {
                if (scene && typeof scene.enter === 'function') {
                    this.stage.register(scene);
                }
            });

            logger.info(`Registered ${this.stage.scenes.size} scenes`);
        } catch (error) {
            logger.error('Failed to register scenes', error);
            throw error;
        }
    }

    setupMiddlewares() {
        try {
            // Session middleware (required for scenes)
            this.bot.use(session({
                defaultSession: () => ({
                    user: null,
                    scene_state: {},
                    temp_data: {}
                })
            }));

            // Stage middleware
            this.bot.use(this.stage.middleware());

            // Auth middleware - ensures user exists in database
            this.bot.use(auth.ensureUser());

            // Rate limiting middleware
            this.bot.use(rateLimitMiddleware.general('api_call'));

            logger.info('Middlewares setup completed');
        } catch (error) {
            logger.error('Failed to setup middlewares', error);
            throw error;
        }
    }

    setupCommands() {
        try {
            // Start command
            this.bot.start(async (ctx) => {
                await startCommand.handle(ctx);
            });

            // Help command
            this.bot.help(async (ctx) => {
                await this.showHelpMenu(ctx);
            });

            // Main menu command
            this.bot.command('menu', async (ctx) => {
                await this.showMainMenu(ctx);
            });

            // Admin commands
            this.bot.command('admin', auth.requireAdmin(), async (ctx) => {
                await this.showAdminMenu(ctx);
            });

            logger.info('Commands setup completed');
        } catch (error) {
            logger.error('Failed to setup commands', error);
            throw error;
        }
    }

    setupCallbackHandlers() {
        try {
            // Main menu navigation
            this.bot.action('main_menu', async (ctx) => {
                await this.showMainMenu(ctx);
            });

            // Role selection handlers
            this.bot.action(/^role_select_(.+)$/, async (ctx) => {
                const role = ctx.match[1];
                await roleSelectHandler.handleRoleSelection(ctx, role);
            });

            // Marketplace handlers
            this.bot.action('marketplace_main', async (ctx) => {
                await marketplaceCommand.showMainMenu(ctx);
            });

            this.bot.action('marketplace_browse', async (ctx) => {
                await marketplaceCommand.browseListings(ctx);
            });

            this.bot.action(/^marketplace_browse_(\d+)_(.+)$/, async (ctx) => {
                const page = parseInt(ctx.match[1]);
                const filters = JSON.parse(ctx.match[2] || '{}');
                await marketplaceCommand.browseListings(ctx, page, filters);
            });

            this.bot.action('marketplace_my_listings', async (ctx) => {
                await marketplaceCommand.showMyListings(ctx);
            });

            this.bot.action(/^marketplace_my_listings_(\d+)$/, async (ctx) => {
                const page = parseInt(ctx.match[1]);
                await marketplaceCommand.showMyListings(ctx, page);
            });

            this.bot.action('marketplace_categories', async (ctx) => {
                await marketplaceCommand.showCategories(ctx);
            });

            this.bot.action('marketplace_featured', async (ctx) => {
                await marketplaceCommand.showFeatured(ctx);
            });

            // Wallet handlers
            this.bot.action('wallet_main', async (ctx) => {
                await walletCommand.showMainMenu(ctx);
            });

            // Boost handlers
            this.bot.action('boost_main', async (ctx) => {
                await boostCommand.showMainMenu(ctx);
            });

            this.bot.action('boost_packages', async (ctx) => {
                await boostCommand.showPackages(ctx);
            });

            this.bot.action('boost_listing', async (ctx) => {
                await boostCommand.boostListing(ctx);
            });

            this.bot.action('boost_my_boosts', async (ctx) => {
                await boostCommand.showMyBoosts(ctx);
            });

            // Profile handlers
            this.bot.action('profile_main', async (ctx) => {
                await profileCommand.showProfile(ctx);
            });

            this.bot.action('complete_profile', async (ctx) => {
                await ctx.scene.enter('profileWizard');
            });

            // Approval handlers
            this.bot.action(/^approve_(.+)_(.+)$/, async (ctx) => {
                const type = ctx.match[1];
                const requestId = ctx.match[2];
                await approvalHandler.approve(ctx, type, requestId);
            });

            this.bot.action(/^reject_(.+)_(.+)$/, async (ctx) => {
                const type = ctx.match[1];
                const requestId = ctx.match[2];
                await approvalHandler.reject(ctx, type, requestId);
            });

            // Admin handlers
            this.bot.action('admin_main', auth.requireAdmin(), async (ctx) => {
                await this.showAdminMenu(ctx);
            });

            this.bot.action('admin_approvals', auth.requireAdmin(), async (ctx) => {
                await adminApprove.showPendingApprovals(ctx);
            });

            this.bot.action('admin_broadcast', auth.requireAdmin(), async (ctx) => {
                await adminBroadcast.showBroadcastMenu(ctx);
            });

            this.bot.action('admin_requests', auth.requireAdmin(), async (ctx) => {
                await adminRequests.showAllRequests(ctx);
            });

            // Scene entry handlers
            this.bot.action('create_listing', async (ctx) => {
                await ctx.scene.enter('listingWizard');
            });

            this.bot.action('wallet_deposit', async (ctx) => {
                await ctx.scene.enter('walletWizard', { action: 'deposit' });
            });

            this.bot.action('wallet_withdraw', async (ctx) => {
                await ctx.scene.enter('walletWizard', { action: 'withdraw' });
            });

            // Wallet deposit handlers
            this.bot.action('wallet_deposit', async (ctx) => {
                await walletCommand.showDepositMenu(ctx);
            });

            this.bot.action(/^wallet_deposit_(\d+)$/, async (ctx) => {
                const amount = parseInt(ctx.match[1]);
                await walletCommand.processDeposit(ctx, amount);
            });

            this.bot.action('wallet_buy_stars', async (ctx) => {
                await walletCommand.showStarsMenu(ctx);
            });

            this.bot.action(/^wallet_stars_(\d+)$/, async (ctx) => {
                const starsAmount = parseInt(ctx.match[1]);
                await walletCommand.processStarsPurchase(ctx, starsAmount);
            });

            this.bot.action('wallet_history', async (ctx) => {
                await walletCommand.showTransactionHistory(ctx);
            });

            this.bot.action(/^wallet_history_(\d+)$/, async (ctx) => {
                const page = parseInt(ctx.match[1]);
                await walletCommand.showTransactionHistory(ctx, page);
            });

            this.bot.action('wallet_escrow', async (ctx) => {
                await walletCommand.showEscrowStatus(ctx);
            });

            // Referral handlers
            this.bot.action('referral_main', async (ctx) => {
                await referralCommand.showMainMenu(ctx);
            });

            this.bot.action('referral_copy_link', async (ctx) => {
                await referralCommand.showReferralLink(ctx);
            });

            this.bot.action('referral_stats', async (ctx) => {
                await referralCommand.showStatistics(ctx);
            });

            this.bot.action('referral_list', async (ctx) => {
                await referralCommand.showReferralList(ctx);
            });

            this.bot.action(/^referral_list_(\d+)$/, async (ctx) => {
                const page = parseInt(ctx.match[1]);
                await referralCommand.showReferralList(ctx, page);
            });

            this.bot.action('referral_earnings', async (ctx) => {
                await referralCommand.showEarnings(ctx);
            });

            this.bot.action('referral_claim', async (ctx) => {
                await referralCommand.claimRewards(ctx);
            });

            this.bot.action('referral_help', async (ctx) => {
                await referralCommand.showHelp(ctx);
            });

            // Boost handlers continued
            this.bot.action(/^boost_buy_package_(.+)$/, async (ctx) => {
                const packageId = ctx.match[1];
                await boostCommand.confirmPurchase(ctx, packageId, null, 'profile');
            });

            this.bot.action(/^boost_select_listing_(.+)$/, async (ctx) => {
                const listingId = ctx.match[1];
                await boostCommand.showPackages(ctx); // Show packages for the selected listing
            });

            // Marketplace creation handlers
            this.bot.action('marketplace_create', roleGuard.canCreateListings(), async (ctx) => {
                await ctx.scene.enter('listingWizard');
            });

            // Payment handlers
            this.bot.on('successful_payment', async (ctx) => {
                try {
                    const payment = ctx.message.successful_payment;
                    const result = await walletService.processPayment(payment);
                    
                    if (result.success) {
                        await ctx.reply(
                            '🎉 <b>Payment Successful!</b>\n\n' +
                            `💰 <b>Amount:</b> ${payment.total_amount / 100} ${payment.currency}\n` +
                            `💳 <b>Payment ID:</b> ${payment.telegram_payment_charge_id}\n\n` +
                            '✅ Your wallet has been updated.',
                            { parse_mode: 'HTML' }
                        );
                        
                        // Show updated wallet
                        await walletCommand.showMainMenu(ctx);
                    } else {
                        await ctx.reply(
                            '❌ <b>Payment Processing Error</b>\n\n' +
                            'Your payment was received but there was an error processing it. Please contact support.',
                            { parse_mode: 'HTML' }
                        );
                    }
                } catch (error) {
                    logger.error('Successful payment handler error', error);
                    await ctx.reply(
                        '❌ <b>Error</b>\n\nThere was an error processing your payment. Please contact support.',
                        { parse_mode: 'HTML' }
                    );
                }
            });

            this.bot.on('pre_checkout_query', async (ctx) => {
                try {
                    const query = ctx.preCheckoutQuery;
                    
                    // Validate the payment
                    const validation = cryptoUtils.validateTelegramPayment({
                        invoice_payload: query.invoice_payload,
                        total_amount: query.total_amount,
                        currency: query.currency
                    });

                    if (validation.valid) {
                        await ctx.answerPreCheckoutQuery(true);
                    } else {
                        await ctx.answerPreCheckoutQuery(false, validation.error);
                    }
                } catch (error) {
                    logger.error('Pre-checkout query error', error);
                    await ctx.answerPreCheckoutQuery(false, 'Payment validation failed');
                }
            });

            // Generic back handler
            this.bot.action('back', async (ctx) => {
                await this.showMainMenu(ctx);
            });

            logger.info('Callback handlers setup completed');
        } catch (error) {
            logger.error('Failed to setup callback handlers', error);
            throw error;
        }
    }

    setupErrorHandling() {
        try {
            this.bot.catch((err, ctx) => {
                logger.error('Bot error occurred', err, {
                    userId: ctx.from?.id,
                    updateType: ctx.updateType,
                    message: ctx.message?.text
                });

                // Send user-friendly error message
                ctx.reply(
                    '❌ <b>Oops! Something went wrong</b>\n\n' +
                    '🔧 Our team has been notified and will fix this soon.\n\n' +
                    '💡 Please try again in a few moments.',
                    { parse_mode: 'HTML' }
                ).catch(() => {
                    // If even the error message fails, log it
                    logger.error('Failed to send error message to user', { userId: ctx.from?.id });
                });
            });

            logger.info('Error handling setup completed');
        } catch (error) {
            logger.error('Failed to setup error handling', error);
            throw error;
        }
    }

    async showMainMenu(ctx) {
        try {
            const user = ctx.user;
            
            if (!user) {
                await startCommand.handle(ctx);
                return;
            }

            // Check if user needs to complete onboarding
            if (!user.role || user.status !== 'approved') {
                await startCommand.handle(ctx);
                return;
            }

            const keyboard = {
                reply_markup: {
                    inline_keyboard: [
                        [
                            { text: '🏪 Marketplace', callback_data: 'marketplace_main' },
                            { text: '👤 Profile', callback_data: 'profile_main' }
                        ],
                        [
                            { text: '💰 Wallet', callback_data: 'wallet_main' },
                            { text: '🚀 Boost', callback_data: 'boost_main' }
                        ],
                        [
                            { text: '🤝 Referrals', callback_data: 'referral_main' },
                            { text: '📊 Trust Score', callback_data: 'trust_score_main' }
                        ],
                        [
                            { text: '📲 Notifications', callback_data: 'notifications_main' },
                            { text: '🛡️ Support', callback_data: 'support_main' }
                        ]
                    ]
                }
            };

            const roleEmojis = {
                vendor: '🏪',
                buyer: '🛒',
                caller: '📞'
            };

            const roleEmoji = roleEmojis[user.role] || '👤';
            const premiumBadge = user.isPremium ? '⭐' : '';

            let message = `🏠 <b>Main Menu</b>\n\n`;
            message += `${roleEmoji} Welcome back, <b>${user.firstName || user.username}</b>! ${premiumBadge}\n\n`;
            message += `📋 <b>Role:</b> ${user.role?.charAt(0).toUpperCase() + user.role?.slice(1)}\n`;
            message += `⭐ <b>Trust Score:</b> ${user.trustScore || 100}\n`;
            
            if (user.referralCode) {
                message += `🔗 <b>Referral Code:</b> <code>${user.referralCode}</code>\n`;
            }

            message += '\n🎯 <b>What would you like to do today?</b>';

            if (ctx.callbackQuery) {
                await ctx.editMessageText(message, { ...keyboard, parse_mode: 'HTML' });
            } else {
                await ctx.reply(message, { ...keyboard, parse_mode: 'HTML' });
            }
        } catch (error) {
            logger.error('Main menu error', error, { userId: ctx.user?.id });
            await ctx.reply('❌ <b>Error loading main menu</b>\n\nPlease try again.', {
                parse_mode: 'HTML'
            });
        }
    }

    async showHelpMenu(ctx) {
        try {
            const keyboard = {
                reply_markup: {
                    inline_keyboard: [
                        [
                            { text: '❓ FAQ', callback_data: 'help_faq' },
                            { text: '📞 Contact Support', url: 'https://t.me/support' }
                        ],
                        [
                            { text: '📖 User Guide', callback_data: 'help_guide' },
                            { text: '🎥 Video Tutorials', callback_data: 'help_videos' }
                        ],
                        [
                            { text: '🏠 Main Menu', callback_data: 'main_menu' }
                        ]
                    ]
                }
            };

            await ctx.reply(
                '❓ <b>Help & Support</b>\n\n' +
                '👋 Need assistance? We\'re here to help!\n\n' +
                '📚 <b>Available Resources:</b>\n' +
                '• Frequently Asked Questions\n' +
                '• Complete user guide\n' +
                '• Video tutorials\n' +
                '• Direct support chat\n\n' +
                '💬 For urgent matters, contact our support team directly.',
                { ...keyboard, parse_mode: 'HTML' }
            );
        } catch (error) {
            logger.error('Help menu error', error, { userId: ctx.user?.id });
            await ctx.reply('❌ <b>Error loading help menu</b>\n\nPlease try again.', {
                parse_mode: 'HTML'
            });
        }
    }

    async showAdminMenu(ctx) {
        try {
            const keyboard = {
                reply_markup: {
                    inline_keyboard: [
                        [
                            { text: '✅ Approvals', callback_data: 'admin_approvals' },
                            { text: '📢 Broadcast', callback_data: 'admin_broadcast' }
                        ],
                        [
                            { text: '📋 All Requests', callback_data: 'admin_requests' },
                            { text: '🛡️ Audit Log', callback_data: 'admin_audit' }
                        ],
                        [
                            { text: '👥 User Management', callback_data: 'admin_users' },
                            { text: '📊 Statistics', callback_data: 'admin_stats' }
                        ],
                        [
                            { text: '⚙️ Settings', callback_data: 'admin_settings' },
                            { text: '🏠 Main Menu', callback_data: 'main_menu' }
                        ]
                    ]
                }
            };

            await ctx.editMessageText(
                '👑 <b>Admin Panel</b>\n\n' +
                '🛡️ Administrative controls and oversight\n\n' +
                '📋 <b>Available Actions:</b>\n' +
                '• Review and approve requests\n' +
                '• Send broadcasts to users\n' +
                '• View audit logs\n' +
                '• Manage user accounts\n' +
                '• View platform statistics',
                { ...keyboard, parse_mode: 'HTML' }
            );
        } catch (error) {
            logger.error('Admin menu error', error, { userId: ctx.user?.id });
            await ctx.reply('❌ <b>Error loading admin menu</b>\n\nPlease try again.', {
                parse_mode: 'HTML'
            });
        }
    }

    async start() {
        try {
            if (!this.initialized) {
                await this.initialize();
            }

            await this.bot.launch();
            logger.info('Telegram bot started successfully');
            
            // Set bot commands
            await this.setBotCommands();
            
        } catch (error) {
            logger.error('Failed to start Telegram bot', error);
            throw error;
        }
    }

    async setBotCommands() {
        try {
            const commands = [
                { command: 'start', description: '🏠 Start the bot' },
                { command: 'menu', description: '📋 Show main menu' },
                { command: 'help', description: '❓ Get help and support' }
            ];

            await this.bot.telegram.setMyCommands(commands);
            logger.info('Bot commands set successfully');
        } catch (error) {
            logger.error('Failed to set bot commands', error);
        }
    }

    async stop() {
        try {
            if (this.bot) {
                this.bot.stop('SIGTERM');
                logger.info('Telegram bot stopped');
            }
        } catch (error) {
            logger.error('Error stopping Telegram bot', error);
        }
    }

    // Graceful shutdown
    enableGracefulStop() {
        process.once('SIGINT', () => this.stop());
        process.once('SIGTERM', () => this.stop());
    }
}

module.exports = new TelegramBot();
