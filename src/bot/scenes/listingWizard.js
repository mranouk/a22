const { Scenes } = require('telegraf');
const marketplaceService = require('../../services/marketplaceService');
const boostService = require('../../services/boostService');
const trustScoreHandler = require('../handlers/trustScoreHandler');
const { validators } = require('../../utils/validators');
const { formatCurrency } = require('../../utils/helpers');
const logger = require('../../utils/logger');

const listingWizard = new Scenes.WizardScene(
    'listingWizard',
    
    // Step 1: Select category
    async (ctx) => {
        try {
            const keyboard = {
                reply_markup: {
                    inline_keyboard: [
                        [
                            { text: '🏠 Real Estate', callback_data: 'category_real_estate' },
                            { text: '🚗 Vehicles', callback_data: 'category_vehicles' }
                        ],
                        [
                            { text: '💻 Electronics', callback_data: 'category_electronics' },
                            { text: '👔 Fashion', callback_data: 'category_fashion' }
                        ],
                        [
                            { text: '🏪 Services', callback_data: 'category_services' },
                            { text: '🎮 Entertainment', callback_data: 'category_entertainment' }
                        ],
                        [
                            { text: '📚 Education', callback_data: 'category_education' },
                            { text: '🏥 Health', callback_data: 'category_health' }
                        ],
                        [
                            { text: '🔧 Tools', callback_data: 'category_tools' },
                            { text: '🌿 Other', callback_data: 'category_other' }
                        ],
                        [
                            { text: '❌ Cancel', callback_data: 'wizard_cancel' }
                        ]
                    ]
                }
            };

            await ctx.reply(
                '🏷️ <b>Create New Listing - Step 1/6</b>\n\n' +
                '📋 Please select a category for your listing:\n\n' +
                '💡 <b>Tip:</b> Choose the most relevant category to help buyers find your item.',
                { ...keyboard, parse_mode: 'HTML' }
            );

            // Handle category selection
            ctx.wizard.state.listingData = {};
            
            return ctx.wizard.next();
        } catch (error) {
            logger.error('Listing wizard step 1 error', error);
            await ctx.reply('❌ <b>Error starting listing creation</b>\n\nPlease try again.', {
                parse_mode: 'HTML'
            });
            return ctx.scene.leave();
        }
    },

    // Step 2: Enter title
    async (ctx) => {
        try {
            if (ctx.callbackQuery) {
                const category = ctx.callbackQuery.data.replace('category_', '');
                
                if (category === 'wizard_cancel') {
                    await ctx.editMessageText('❌ <b>Listing creation cancelled</b>', {
                        parse_mode: 'HTML'
                    });
                    return ctx.scene.leave();
                }

                ctx.wizard.state.listingData.category = category.replace('_', ' ');
                await ctx.answerCbQuery();

                const keyboard = {
                    reply_markup: {
                        inline_keyboard: [
                            [{ text: '❌ Cancel', callback_data: 'wizard_cancel' }]
                        ]
                    }
                };

                await ctx.editMessageText(
                    '📝 <b>Create New Listing - Step 2/6</b>\n\n' +
                    `✅ <b>Category:</b> ${ctx.wizard.state.listingData.category}\n\n` +
                    '💬 Please enter a title for your listing:\n\n' +
                    '📏 <b>Requirements:</b>\n' +
                    '• 10-100 characters\n' +
                    '• Clear and descriptive\n' +
                    '• No special characters\n\n' +
                    '💡 <b>Example:</b> "iPhone 15 Pro Max 256GB - Like New"',
                    { ...keyboard, parse_mode: 'HTML' }
                );

                return ctx.wizard.next();
            }

            // Handle title input
            if (ctx.message && ctx.message.text) {
                const title = ctx.message.text.trim();
                
                try {
                    validators.validateListingTitle(title);
                    ctx.wizard.state.listingData.title = title;

                    const keyboard = {
                        reply_markup: {
                            inline_keyboard: [
                                [{ text: '❌ Cancel', callback_data: 'wizard_cancel' }]
                            ]
                        }
                    };

                    await ctx.reply(
                        '📄 <b>Create New Listing - Step 3/6</b>\n\n' +
                        `✅ <b>Category:</b> ${ctx.wizard.state.listingData.category}\n` +
                        `✅ <b>Title:</b> ${ctx.wizard.state.listingData.title}\n\n` +
                        '📝 Please enter a detailed description:\n\n' +
                        '📏 <b>Requirements:</b>\n' +
                        '• 50-2000 characters\n' +
                        '• Detailed and honest\n' +
                        '• Include condition, features, etc.\n\n' +
                        '💡 <b>Tip:</b> More details = more interest!',
                        { ...keyboard, parse_mode: 'HTML' }
                    );

                    return ctx.wizard.next();
                } catch (validationError) {
                    await ctx.reply(
                        `❌ <b>Invalid Title</b>\n\n${validationError.message}\n\nPlease try again:`,
                        { parse_mode: 'HTML' }
                    );
                    return;
                }
            }
        } catch (error) {
            logger.error('Listing wizard step 2 error', error);
            await ctx.reply('❌ <b>Error processing input</b>\n\nPlease try again.', {
                parse_mode: 'HTML'
            });
        }
    },

    // Step 3: Enter description
    async (ctx) => {
        try {
            if (ctx.callbackQuery && ctx.callbackQuery.data === 'wizard_cancel') {
                await ctx.editMessageText('❌ <b>Listing creation cancelled</b>', {
                    parse_mode: 'HTML'
                });
                return ctx.scene.leave();
            }

            if (ctx.message && ctx.message.text) {
                const description = ctx.message.text.trim();
                
                try {
                    validators.validateListingDescription(description);
                    ctx.wizard.state.listingData.description = description;

                    const keyboard = {
                        reply_markup: {
                            inline_keyboard: [
                                [
                                    { text: '💵 $10', callback_data: 'price_10' },
                                    { text: '💵 $25', callback_data: 'price_25' },
                                    { text: '💵 $50', callback_data: 'price_50' }
                                ],
                                [
                                    { text: '💵 $100', callback_data: 'price_100' },
                                    { text: '💵 $250', callback_data: 'price_250' },
                                    { text: '💵 $500', callback_data: 'price_500' }
                                ],
                                [
                                    { text: '💰 Custom Amount', callback_data: 'price_custom' }
                                ],
                                [
                                    { text: '❌ Cancel', callback_data: 'wizard_cancel' }
                                ]
                            ]
                        }
                    };

                    await ctx.reply(
                        '💰 <b>Create New Listing - Step 4/6</b>\n\n' +
                        `✅ <b>Category:</b> ${ctx.wizard.state.listingData.category}\n` +
                        `✅ <b>Title:</b> ${ctx.wizard.state.listingData.title}\n` +
                        `✅ <b>Description:</b> ${description.substring(0, 50)}...\n\n` +
                        '💵 Please set a price for your listing:\n\n' +
                        '💡 <b>Tips:</b>\n' +
                        '• Research similar items\n' +
                        '• Price competitively\n' +
                        '• Consider negotiation room',
                        { ...keyboard, parse_mode: 'HTML' }
                    );

                    return ctx.wizard.next();
                } catch (validationError) {
                    await ctx.reply(
                        `❌ <b>Invalid Description</b>\n\n${validationError.message}\n\nPlease try again:`,
                        { parse_mode: 'HTML' }
                    );
                    return;
                }
            }
        } catch (error) {
            logger.error('Listing wizard step 3 error', error);
            await ctx.reply('❌ <b>Error processing description</b>\n\nPlease try again.', {
                parse_mode: 'HTML'
            });
        }
    },

    // Step 4: Set price
    async (ctx) => {
        try {
            if (ctx.callbackQuery) {
                await ctx.answerCbQuery();
                
                if (ctx.callbackQuery.data === 'wizard_cancel') {
                    await ctx.editMessageText('❌ <b>Listing creation cancelled</b>', {
                        parse_mode: 'HTML'
                    });
                    return ctx.scene.leave();
                }

                if (ctx.callbackQuery.data === 'price_custom') {
                    await ctx.editMessageText(
                        '💰 <b>Custom Price</b>\n\n' +
                        '💵 Please enter your custom price (USD):\n\n' +
                        '📏 <b>Format:</b> Enter just the number (e.g., 150.50)\n' +
                        '💡 <b>Range:</b> $1.00 - $100,000.00',
                        { parse_mode: 'HTML' }
                    );
                    return;
                }

                const priceMatch = ctx.callbackQuery.data.match(/^price_(\d+)$/);
                if (priceMatch) {
                    const price = parseFloat(priceMatch[1]);
                    ctx.wizard.state.listingData.price = price;

                    const keyboard = {
                        reply_markup: {
                            inline_keyboard: [
                                [
                                    { text: '📍 Add Location', callback_data: 'add_location' },
                                    { text: '⏭️ Skip Location', callback_data: 'skip_location' }
                                ],
                                [
                                    { text: '❌ Cancel', callback_data: 'wizard_cancel' }
                                ]
                            ]
                        }
                    };

                    await ctx.editMessageText(
                        '📍 <b>Create New Listing - Step 5/6</b>\n\n' +
                        `✅ <b>Category:</b> ${ctx.wizard.state.listingData.category}\n` +
                        `✅ <b>Title:</b> ${ctx.wizard.state.listingData.title}\n` +
                        `✅ <b>Price:</b> ${formatCurrency(price)}\n\n` +
                        '🗺️ Would you like to add a location?\n\n' +
                        '💡 <b>Benefits:</b>\n' +
                        '• Helps buyers find you\n' +
                        '• Increases trust\n' +
                        '• Better for local deals',
                        { ...keyboard, parse_mode: 'HTML' }
                    );

                    return ctx.wizard.next();
                }
            }

            // Handle custom price input
            if (ctx.message && ctx.message.text) {
                const priceText = ctx.message.text.trim();
                const price = parseFloat(priceText);

                try {
                    validators.validatePrice(price);
                    ctx.wizard.state.listingData.price = price;

                    const keyboard = {
                        reply_markup: {
                            inline_keyboard: [
                                [
                                    { text: '📍 Add Location', callback_data: 'add_location' },
                                    { text: '⏭️ Skip Location', callback_data: 'skip_location' }
                                ],
                                [
                                    { text: '❌ Cancel', callback_data: 'wizard_cancel' }
                                ]
                            ]
                        }
                    };

                    await ctx.reply(
                        '📍 <b>Create New Listing - Step 5/6</b>\n\n' +
                        `✅ <b>Category:</b> ${ctx.wizard.state.listingData.category}\n` +
                        `✅ <b>Title:</b> ${ctx.wizard.state.listingData.title}\n` +
                        `✅ <b>Price:</b> ${formatCurrency(price)}\n\n` +
                        '🗺️ Would you like to add a location?\n\n' +
                        '💡 <b>Benefits:</b>\n' +
                        '• Helps buyers find you\n' +
                        '• Increases trust\n' +
                        '• Better for local deals',
                        { ...keyboard, parse_mode: 'HTML' }
                    );

                    return ctx.wizard.next();
                } catch (validationError) {
                    await ctx.reply(
                        `❌ <b>Invalid Price</b>\n\n${validationError.message}\n\nPlease enter a valid price:`,
                        { parse_mode: 'HTML' }
                    );
                    return;
                }
            }
        } catch (error) {
            logger.error('Listing wizard step 4 error', error);
            await ctx.reply('❌ <b>Error processing price</b>\n\nPlease try again.', {
                parse_mode: 'HTML'
            });
        }
    },

    // Step 5: Add location (optional)
    async (ctx) => {
        try {
            if (ctx.callbackQuery) {
                await ctx.answerCbQuery();

                if (ctx.callbackQuery.data === 'wizard_cancel') {
                    await ctx.editMessageText('❌ <b>Listing creation cancelled</b>', {
                        parse_mode: 'HTML'
                    });
                    return ctx.scene.leave();
                }

                if (ctx.callbackQuery.data === 'add_location') {
                    await ctx.editMessageText(
                        '📍 <b>Add Location</b>\n\n' +
                        '🌍 Please send your location or enter a city/area:\n\n' +
                        '📱 <b>Options:</b>\n' +
                        '• Use "📎 → Location" to share current location\n' +
                        '• Type city name (e.g., "New York, NY")\n' +
                        '• Type area (e.g., "Downtown Manhattan")',
                        { parse_mode: 'HTML' }
                    );
                    return;
                }

                if (ctx.callbackQuery.data === 'skip_location') {
                    return this.showFinalReview(ctx);
                }
            }

            // Handle location input
            if (ctx.message) {
                if (ctx.message.location) {
                    ctx.wizard.state.listingData.location = {
                        type: 'coordinates',
                        latitude: ctx.message.location.latitude,
                        longitude: ctx.message.location.longitude
                    };
                } else if (ctx.message.text) {
                    ctx.wizard.state.listingData.location = {
                        type: 'text',
                        address: ctx.message.text.trim()
                    };
                }

                return this.showFinalReview(ctx);
            }
        } catch (error) {
            logger.error('Listing wizard step 5 error', error);
            await ctx.reply('❌ <b>Error processing location</b>\n\nPlease try again.', {
                parse_mode: 'HTML'
            });
        }
    },

    // Step 6: Final review and boost options
    async (ctx) => {
        return this.showFinalReview(ctx);
    }
);

// Show final review method
listingWizard.showFinalReview = async function(ctx) {
    try {
        const data = ctx.wizard.state.listingData;
        
        let locationText = '❌ Not provided';
        if (data.location) {
            if (data.location.type === 'coordinates') {
                locationText = `📍 GPS Location (${data.location.latitude}, ${data.location.longitude})`;
            } else {
                locationText = `📍 ${data.location.address}`;
            }
        }

        const keyboard = {
            reply_markup: {
                inline_keyboard: [
                    [
                        { text: '✅ Publish Listing', callback_data: 'publish_listing' },
                        { text: '🚀 Publish + Boost', callback_data: 'publish_boost' }
                    ],
                    [
                        { text: '✏️ Edit Details', callback_data: 'edit_listing' },
                        { text: '❌ Cancel', callback_data: 'wizard_cancel' }
                    ]
                ]
            }
        };

        const message = '📋 <b>Create New Listing - Final Review</b>\n\n' +
            '🔍 <b>Please review your listing:</b>\n\n' +
            `🏷️ <b>Category:</b> ${data.category}\n` +
            `📝 <b>Title:</b> ${data.title}\n` +
            `💰 <b>Price:</b> ${formatCurrency(data.price)}\n` +
            `🗺️ <b>Location:</b> ${locationText}\n\n` +
            `📄 <b>Description:</b>\n${data.description}\n\n` +
            '🚀 <b>Boost Option:</b>\n' +
            '• Publish + Boost: $5 extra for 24h priority visibility\n' +
            '• Regular Publish: Free listing\n\n' +
            '✅ Ready to publish?';

        if (ctx.callbackQuery) {
            await ctx.editMessageText(message, { ...keyboard, parse_mode: 'HTML' });
        } else {
            await ctx.reply(message, { ...keyboard, parse_mode: 'HTML' });
        }

        // Handle final actions
        ctx.callbackQuery && await ctx.answerCbQuery();
    } catch (error) {
        logger.error('Show final review error', error);
        await ctx.reply('❌ <b>Error showing review</b>\n\nPlease try again.', {
            parse_mode: 'HTML'
        });
    }
};

// Handle publish actions
listingWizard.action('publish_listing', async (ctx) => {
    try {
        await ctx.answerCbQuery();
        
        const listingData = ctx.wizard.state.listingData;
        
        // Create the listing
        const listing = await marketplaceService.createListing({
            userId: ctx.user.id,
            title: listingData.title,
            description: listingData.description,
            category: listingData.category,
            price: listingData.price,
            location: listingData.location,
            isActive: true
        });

        // Update trust score
        await trustScoreHandler.updateTrustScoreAfterTransaction(
            ctx.user.id,
            'listing_creation',
            listingData.price,
            'completed'
        );

        await ctx.editMessageText(
            '🎉 <b>Listing Published Successfully!</b>\n\n' +
            `🆔 <b>Listing ID:</b> ${listing.id.substring(0, 8)}...\n` +
            `📝 <b>Title:</b> ${listingData.title}\n` +
            `💰 <b>Price:</b> ${formatCurrency(listingData.price)}\n\n` +
            '✅ Your listing is now live and visible to buyers!\n' +
            '📱 You\'ll receive notifications when buyers show interest.',
            {
                parse_mode: 'HTML',
                reply_markup: {
                    inline_keyboard: [
                        [
                            { text: '👀 View Listing', callback_data: `listing_view_${listing.id}` },
                            { text: '🚀 Boost Now', callback_data: `boost_listing_${listing.id}` }
                        ],
                        [
                            { text: '🏠 Main Menu', callback_data: 'main_menu' }
                        ]
                    ]
                }
            }
        );

        return ctx.scene.leave();
    } catch (error) {
        logger.error('Publish listing error', error);
        await ctx.reply('❌ <b>Error publishing listing</b>\n\nPlease try again.', {
            parse_mode: 'HTML'
        });
    }
});

listingWizard.action('publish_boost', async (ctx) => {
    try {
        await ctx.answerCbQuery();
        
        // Check if user has sufficient balance for boost
        const boostCost = 5; // $5 for boost
        const hasBalance = await walletService.hasBalance(ctx.user.id, boostCost);
        
        if (!hasBalance) {
            await ctx.editMessageText(
                '💳 <b>Insufficient Balance</b>\n\n' +
                `💰 <b>Required:</b> ${formatCurrency(boostCost)} for boost\n` +
                '📱 Please add funds to your wallet first.',
                {
                    parse_mode: 'HTML',
                    reply_markup: {
                        inline_keyboard: [
                            [{ text: '💰 Add Funds', callback_data: 'wallet_deposit' }],
                            [{ text: '📄 Publish Without Boost', callback_data: 'publish_listing' }]
                        ]
                    }
                }
            );
            return;
        }

        const listingData = ctx.wizard.state.listingData;
        
        // Create the listing with boost
        const listing = await marketplaceService.createListing({
            userId: ctx.user.id,
            title: listingData.title,
            description: listingData.description,
            category: listingData.category,
            price: listingData.price,
            location: listingData.location,
            isActive: true,
            isBoosted: true
        });

        // Purchase boost
        await boostService.purchaseBoost(ctx.user.id, 'listing_boost', listing.id, 'listing');

        // Update trust score
        await trustScoreHandler.updateTrustScoreAfterTransaction(
            ctx.user.id,
            'listing_creation',
            listingData.price,
            'completed'
        );

        await ctx.editMessageText(
            '🚀 <b>Listing Published & Boosted!</b>\n\n' +
            `🆔 <b>Listing ID:</b> ${listing.id.substring(0, 8)}...\n` +
            `📝 <b>Title:</b> ${listingData.title}\n` +
            `💰 <b>Price:</b> ${formatCurrency(listingData.price)}\n` +
            `🚀 <b>Boost:</b> 24h priority visibility\n\n` +
            '🔥 Your listing is now boosted and will appear at the top!\n' +
            '📈 Expect increased visibility and more inquiries.',
            {
                parse_mode: 'HTML',
                reply_markup: {
                    inline_keyboard: [
                        [
                            { text: '👀 View Listing', callback_data: `listing_view_${listing.id}` },
                            { text: '📊 Boost Analytics', callback_data: `boost_analytics_${listing.id}` }
                        ],
                        [
                            { text: '🏠 Main Menu', callback_data: 'main_menu' }
                        ]
                    ]
                }
            }
        );

        return ctx.scene.leave();
    } catch (error) {
        logger.error('Publish with boost error', error);
        await ctx.reply('❌ <b>Error publishing boosted listing</b>\n\nPlease try again.', {
            parse_mode: 'HTML'
        });
    }
});

listingWizard.action('wizard_cancel', async (ctx) => {
    await ctx.answerCbQuery();
    await ctx.editMessageText('❌ <b>Listing creation cancelled</b>', {
        parse_mode: 'HTML'
    });
    return ctx.scene.leave();
});

module.exports = listingWizard;
