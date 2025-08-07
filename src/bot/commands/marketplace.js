const marketplaceService = require('../../services/marketplaceService');
const { createInlineKeyboard, createButton, formatCurrency, paginate } = require('../../utils/helpers');
const { SECTORS } = require('../../utils/constants');
const logger = require('../../utils/logger');

const marketplace = {
    // Main marketplace menu
    async showMainMenu(ctx) {
        try {
            const user = ctx.user;
            const keyboard = {
                reply_markup: {
                    inline_keyboard: [
                        [
                            { text: '🔍 Browse Listings', callback_data: 'marketplace_browse' },
                            { text: '📝 My Listings', callback_data: 'marketplace_my_listings' }
                        ],
                        [
                            { text: '➕ Create Listing', callback_data: 'marketplace_create' },
                            { text: '⭐ Saved Items', callback_data: 'marketplace_saved' }
                        ],
                        [
                            { text: '🔥 Featured', callback_data: 'marketplace_featured' },
                            { text: '📊 Categories', callback_data: 'marketplace_categories' }
                        ],
                        [
                            { text: '🔎 Search', callback_data: 'marketplace_search' },
                            { text: '📈 Analytics', callback_data: 'marketplace_analytics' }
                        ],
                        [
                            { text: '⬅️ Back to Menu', callback_data: 'main_menu' }
                        ]
                    ]
                }
            };

            await ctx.editMessageText(
                '🏪 <b>Marketplace</b>\n\n' +
                '🌟 Welcome to our bustling marketplace!\n\n' +
                '🛒 <b>What would you like to do?</b>\n' +
                '• Browse thousands of listings\n' +
                '• Create your own listings\n' +
                '• Manage saved items\n' +
                '• View analytics and insights',
                { ...keyboard, parse_mode: 'HTML' }
            );
        } catch (error) {
            logger.error('Marketplace main menu error', error, { userId: ctx.user?.id });
            await ctx.reply('❌ <b>Error loading marketplace</b>\n\nPlease try again.', {
                parse_mode: 'HTML'
            });
        }
    },

    // Browse listings with pagination
    async browseListings(ctx, page = 1, filters = {}) {
        try {
            const listings = await marketplaceService.searchListings({
                ...filters,
                status: 'active',
                page,
                limit: 5
            });

            if (!listings.data.length) {
                const keyboard = {
                    reply_markup: {
                        inline_keyboard: [
                            [{ text: '➕ Create First Listing', callback_data: 'marketplace_create' }],
                            [{ text: '⬅️ Back', callback_data: 'marketplace_main' }]
                        ]
                    }
                };

                await ctx.editMessageText(
                    '📭 <b>No Listings Found</b>\n\n' +
                    '🔍 No listings match your criteria.\n\n' +
                    '💡 Try adjusting your filters or create the first listing!',
                    { ...keyboard, parse_mode: 'HTML' }
                );
                return;
            }

            let message = '🔍 <b>Browse Listings</b>\n\n';
            
            // Add filter info if any
            if (filters.sector) {
                message += `📂 Sector: ${filters.sector}\n`;
            }
            if (filters.priceRange) {
                message += `💰 Price: ${filters.priceRange.min} - ${filters.priceRange.max}\n`;
            }
            message += `\n📊 Page ${listings.pagination.currentPage} of ${listings.pagination.totalPages} (${listings.pagination.totalItems} total)\n\n`;

            // List items
            listings.data.forEach((listing, index) => {
                const itemNumber = (page - 1) * 5 + index + 1;
                const boost = listing.boosted ? '🚀 ' : '';
                const premium = listing.creator?.isPremium ? '⭐ ' : '';
                
                message += `${boost}${premium}<b>${itemNumber}. ${listing.title}</b>\n`;
                message += `💰 ${formatCurrency(listing.price)}\n`;
                message += `👤 ${listing.creator?.username || 'Anonymous'}\n`;
                message += `📍 ${listing.location || 'Not specified'}\n`;
                message += `⏰ ${new Date(listing.createdAt).toLocaleDateString()}\n\n`;
            });

            // Create navigation buttons
            const navigationButtons = [];
            const actionButtons = [];

            // Pagination
            if (listings.pagination.hasPrev) {
                navigationButtons.push({
                    text: '◀️ Previous',
                    callback_data: `marketplace_browse_${page - 1}_${JSON.stringify(filters)}`
                });
            }
            if (listings.pagination.hasNext) {
                navigationButtons.push({
                    text: 'Next ▶️',
                    callback_data: `marketplace_browse_${page + 1}_${JSON.stringify(filters)}`
                });
            }

            // Action buttons
            actionButtons.push(
                { text: '🔎 Filter', callback_data: 'marketplace_filter' },
                { text: '🔄 Refresh', callback_data: `marketplace_browse_1_${JSON.stringify(filters)}` }
            );

            // Item selection buttons
            const itemButtons = [];
            listings.data.forEach((listing, index) => {
                const itemNumber = (page - 1) * 5 + index + 1;
                itemButtons.push([{
                    text: `${itemNumber}. View Details`,
                    callback_data: `listing_view_${listing.id}`
                }]);
            });

            const keyboard = {
                reply_markup: {
                    inline_keyboard: [
                        ...itemButtons,
                        navigationButtons.length ? navigationButtons : [],
                        actionButtons,
                        [{ text: '⬅️ Back to Marketplace', callback_data: 'marketplace_main' }]
                    ].filter(row => row.length > 0)
                }
            };

            await ctx.editMessageText(message, { ...keyboard, parse_mode: 'HTML' });
        } catch (error) {
            logger.error('Browse listings error', error, { userId: ctx.user?.id, page, filters });
            await ctx.reply('❌ <b>Error loading listings</b>\n\nPlease try again.', {
                parse_mode: 'HTML'
            });
        }
    },

    // Show user's own listings
    async showMyListings(ctx, page = 1) {
        try {
            const listings = await marketplaceService.getUserListings(ctx.user.id, {
                page,
                limit: 5
            });

            if (!listings.data.length) {
                const keyboard = {
                    reply_markup: {
                        inline_keyboard: [
                            [{ text: '➕ Create Your First Listing', callback_data: 'marketplace_create' }],
                            [{ text: '⬅️ Back to Marketplace', callback_data: 'marketplace_main' }]
                        ]
                    }
                };

                await ctx.editMessageText(
                    '📝 <b>My Listings</b>\n\n' +
                    '📭 You haven\'t created any listings yet.\n\n' +
                    '💡 Create your first listing to start selling!',
                    { ...keyboard, parse_mode: 'HTML' }
                );
                return;
            }

            let message = `📝 <b>My Listings</b>\n\n`;
            message += `📊 Page ${listings.pagination.currentPage} of ${listings.pagination.totalPages} (${listings.pagination.totalItems} total)\n\n`;

            listings.data.forEach((listing, index) => {
                const itemNumber = (page - 1) * 5 + index + 1;
                const statusEmoji = {
                    active: '✅',
                    pending: '⏳',
                    sold: '✅',
                    inactive: '❌'
                };
                
                message += `${statusEmoji[listing.status] || '❓'} <b>${itemNumber}. ${listing.title}</b>\n`;
                message += `💰 ${formatCurrency(listing.price)}\n`;
                message += `📊 Status: ${listing.status.charAt(0).toUpperCase() + listing.status.slice(1)}\n`;
                message += `👀 Views: ${listing.views || 0}\n`;
                message += `💬 Inquiries: ${listing.inquiries || 0}\n`;
                if (listing.boosted) {
                    message += `🚀 Boosted until: ${new Date(listing.boostExpiresAt).toLocaleDateString()}\n`;
                }
                message += `⏰ Created: ${new Date(listing.createdAt).toLocaleDateString()}\n\n`;
            });

            // Create buttons
            const itemButtons = [];
            listings.data.forEach((listing, index) => {
                const itemNumber = (page - 1) * 5 + index + 1;
                itemButtons.push([
                    {
                        text: `✏️ Edit ${itemNumber}`,
                        callback_data: `listing_edit_${listing.id}`
                    },
                    {
                        text: `🚀 Boost ${itemNumber}`,
                        callback_data: `listing_boost_${listing.id}`
                    }
                ]);
            });

            const navigationButtons = [];
            if (listings.pagination.hasPrev) {
                navigationButtons.push({
                    text: '◀️ Previous',
                    callback_data: `marketplace_my_listings_${page - 1}`
                });
            }
            if (listings.pagination.hasNext) {
                navigationButtons.push({
                    text: 'Next ▶️',
                    callback_data: `marketplace_my_listings_${page + 1}`
                });
            }

            const keyboard = {
                reply_markup: {
                    inline_keyboard: [
                        ...itemButtons,
                        navigationButtons.length ? navigationButtons : [],
                        [
                            { text: '➕ Create New', callback_data: 'marketplace_create' },
                            { text: '📊 Analytics', callback_data: 'marketplace_my_analytics' }
                        ],
                        [{ text: '⬅️ Back to Marketplace', callback_data: 'marketplace_main' }]
                    ].filter(row => row.length > 0)
                }
            };

            await ctx.editMessageText(message, { ...keyboard, parse_mode: 'HTML' });
        } catch (error) {
            logger.error('My listings error', error, { userId: ctx.user?.id, page });
            await ctx.reply('❌ <b>Error loading your listings</b>\n\nPlease try again.', {
                parse_mode: 'HTML'
            });
        }
    },

    // Show categories
    async showCategories(ctx) {
        try {
            const categoryButtons = SECTORS.map(sector => [
                { text: `📂 ${sector}`, callback_data: `marketplace_category_${sector}` }
            ]);

            const keyboard = {
                reply_markup: {
                    inline_keyboard: [
                        ...categoryButtons,
                        [{ text: '⬅️ Back to Marketplace', callback_data: 'marketplace_main' }]
                    ]
                }
            };

            await ctx.editMessageText(
                '📊 <b>Categories</b>\n\n' +
                '📂 Choose a category to browse:\n\n' +
                SECTORS.map(sector => `• ${sector}`).join('\n'),
                { ...keyboard, parse_mode: 'HTML' }
            );
        } catch (error) {
            logger.error('Categories error', error, { userId: ctx.user?.id });
            await ctx.reply('❌ <b>Error loading categories</b>\n\nPlease try again.', {
                parse_mode: 'HTML'
            });
        }
    },

    // Show featured listings
    async showFeatured(ctx) {
        try {
            const listings = await marketplaceService.searchListings({
                featured: true,
                status: 'active',
                limit: 10
            });

            if (!listings.data.length) {
                const keyboard = {
                    reply_markup: {
                        inline_keyboard: [
                            [{ text: '🔍 Browse All', callback_data: 'marketplace_browse' }],
                            [{ text: '⬅️ Back', callback_data: 'marketplace_main' }]
                        ]
                    }
                };

                await ctx.editMessageText(
                    '🔥 <b>Featured Listings</b>\n\n' +
                    '📭 No featured listings available right now.\n\n' +
                    '💡 Check back later or browse all listings!',
                    { ...keyboard, parse_mode: 'HTML' }
                );
                return;
            }

            let message = '🔥 <b>Featured Listings</b>\n\n';
            message += '⭐ Hand-picked quality listings:\n\n';

            listings.data.slice(0, 5).forEach((listing, index) => {
                message += `🌟 <b>${index + 1}. ${listing.title}</b>\n`;
                message += `💰 ${formatCurrency(listing.price)}\n`;
                message += `👤 ${listing.creator?.username || 'Anonymous'}\n`;
                message += `📍 ${listing.location || 'Not specified'}\n\n`;
            });

            const itemButtons = listings.data.slice(0, 5).map((listing, index) => [
                { text: `${index + 1}. View Details`, callback_data: `listing_view_${listing.id}` }
            ]);

            const keyboard = {
                reply_markup: {
                    inline_keyboard: [
                        ...itemButtons,
                        [
                            { text: '🔍 Browse All', callback_data: 'marketplace_browse' },
                            { text: '🔄 Refresh', callback_data: 'marketplace_featured' }
                        ],
                        [{ text: '⬅️ Back to Marketplace', callback_data: 'marketplace_main' }]
                    ]
                }
            };

            await ctx.editMessageText(message, { ...keyboard, parse_mode: 'HTML' });
        } catch (error) {
            logger.error('Featured listings error', error, { userId: ctx.user?.id });
            await ctx.reply('❌ <b>Error loading featured listings</b>\n\nPlease try again.', {
                parse_mode: 'HTML'
            });
        }
    }
};

module.exports = marketplace;
