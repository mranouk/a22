const { templates } = require('../ui/templates');
const { keyboards } = require('../ui/keyboards');
const config = require('../config');
const { utils } = require('../utils');
const { onboarding } = require('./onboarding');

const marketplace = {
    // Handle marketplace actions
    async handleAction(ctx) {
        const action = ctx.match[1]; // Everything after "market."
        const [actionType, ...params] = action.split('.');

        switch (actionType) {
            case 'browse':
                const page = params[0]?.split(':')[1] || '1';
                return marketplace.browseListings(ctx, parseInt(page));
            case 'create':
                return marketplace.handleCreateListing(ctx, params);
            case 'view':
                return marketplace.viewListing(ctx, params[0]);
            case 'filter':
                return marketplace.handleFilters(ctx, params);
            case 'sort':
                return marketplace.handleSorting(ctx, params[0]);
            case 'search':
                return marketplace.handleSearch(ctx, params);
            case 'page':
                return marketplace.browseListings(ctx, parseInt(params[0].split(':')[1] || '1'));
            default:
                return ctx.answerCbQuery('⚠️ Marketplace action not found');
        }
    },

    // Browse listings with pagination
    async browseListings(ctx, page = 1) {
        const access = onboarding.checkUserAccess(ctx);
        if (!access.allowed) {
            return ctx.replyWithHTML(templates.error(access.reason));
        }

        // Mock listings data
        const mockListings = [
            {
                id: 'listing_1',
                title: '🚀 Premium Social Media Management',
                description: 'Complete social media management for businesses',
                price: 150,
                seller: 'john_doe',
                category: 'Marketing',
                createdAt: new Date('2024-01-15'),
                boosted: true,
                trustScore: 85
            },
            {
                id: 'listing_2', 
                title: '💻 Custom Website Development',
                description: 'Professional website development using modern technologies',
                price: 500,
                seller: 'web_dev_pro',
                category: 'Technology',
                createdAt: new Date('2024-01-10'),
                boosted: false,
                trustScore: 92
            },
            {
                id: 'listing_3',
                title: '📊 Business Data Analysis',
                description: 'Comprehensive data analysis and reporting services',
                price: 200,
                seller: 'data_expert',
                category: 'Analytics',
                createdAt: new Date('2024-01-12'),
                boosted: true,
                trustScore: 78
            }
        ];

        // Store mock listings
        mockListings.forEach(listing => {
            config.mockData.listings.set(listing.id, listing);
        });

        const listings = Array.from(config.mockData.listings.values())
            .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

        const itemsPerPage = 3;
        const totalPages = Math.ceil(listings.length / itemsPerPage);
        const startIndex = (page - 1) * itemsPerPage;
        const endIndex = startIndex + itemsPerPage;
        const pageListings = listings.slice(startIndex, endIndex);

        let marketText = `🏠 <b>Marketplace</b> (Page ${page}/${totalPages})\n\n`;

        if (pageListings.length === 0) {
            marketText += '📭 <i>No listings available</i>\n\n';
            marketText += 'Be the first to create a listing!';
        } else {
            pageListings.forEach((listing, index) => {
                const boostIcon = listing.boosted ? '🚀 ' : '';
                const trustBadge = utils.getTrustBadge(listing.trustScore);

                marketText += `${boostIcon}<b>${listing.title}</b>\n`;
                marketText += `💲 <b>Price:</b> ${utils.formatStars(listing.price)}\n`;
                marketText += `👤 <b>Seller:</b> @${listing.seller} ${trustBadge}\n`;
                marketText += `📂 <b>Category:</b> ${listing.category}\n`;
                marketText += `📅 ${utils.formatDate(listing.createdAt)}\n\n`;
            });
        }

        // Build keyboard
        const keyboard = [];

        // Listing action buttons
        if (pageListings.length > 0) {
            pageListings.forEach((listing, index) => {
                keyboard.push([{
                    text: `👁️ View #${startIndex + index + 1}`,
                    callback_data: `market.view:${listing.id}`
                }]);
            });
        }

        // Control buttons
        keyboard.push([
            { text: '🔍 Filters', callback_data: 'market.filter.menu' },
            { text: '➕ Create Listing', callback_data: 'market.create.start' }
        ]);

        // Pagination
        if (totalPages > 1) {
            keyboard.push(...keyboards.pagination(page, totalPages, 'market.page'));
        }

        // Back button
        keyboard.push([{ text: '⬅️ Back to Menu', callback_data: 'user.home' }]);

        if (ctx.callbackQuery) {
            return ctx.editMessageText(marketText, {
                parse_mode: 'HTML',
                reply_markup: { inline_keyboard: keyboard }
            });
        } else {
            return ctx.replyWithHTML(marketText, {
                reply_markup: { inline_keyboard: keyboard }
            });
        }
    },

    // View individual listing
    async viewListing(ctx, listingId) {
        const listing = config.mockData.listings.get(listingId);

        if (!listing) {
            return ctx.answerCbQuery('⚠️ Listing not found');
        }

        const trustBadge = utils.getTrustBadge(listing.trustScore);
        const boostIcon = listing.boosted ? '🚀 ' : '';

        let listingText = `${boostIcon}<b>${listing.title}</b>\n\n`;
        listingText += `📝 <b>Description:</b>\n${listing.description}\n\n`;
        listingText += `💲 <b>Price:</b> ${utils.formatStars(listing.price)}\n`;
        listingText += `👤 <b>Seller:</b> @${listing.seller} ${trustBadge}\n`;
        listingText += `📂 <b>Category:</b> ${listing.category}\n`;
        listingText += `📅 <b>Posted:</b> ${utils.formatDate(listing.createdAt)}\n\n`;

        if (listing.boosted) {
            listingText += `🚀 <i>This listing is boosted for higher visibility</i>`;
        }

        const keyboard = [
            [
                { text: '📝 Express Interest', callback_data: `market.interest:${listingId}` },
                { text: '⭐ Save', callback_data: `market.save:${listingId}` }
            ],
            [
                { text: '⚠️ Report', callback_data: `market.report:${listingId}` },
                { text: '🚀 Boost Similar', callback_data: `boosts.create:listing` }
            ],
            [{ text: '⬅️ Back to Browse', callback_data: 'market.browse' }]
        ];

        return ctx.editMessageText(listingText, {
            parse_mode: 'HTML',
            reply_markup: { inline_keyboard: keyboard }
        });
    },

    // Handle listing creation
    async handleCreateListing(ctx, params) {
        const access = onboarding.checkUserAccess(ctx);
        if (!access.allowed) {
            return ctx.replyWithHTML(templates.error(access.reason));
        }

        if (!access.profileComplete) {
            return ctx.editMessageText(
                templates.warning('Please complete your profile before creating listings.'),
                {
                    parse_mode: 'HTML',
                    reply_markup: keyboards.backButton('user.profile.setup')
                }
            );
        }

        const step = params[0];

        if (step === 'start') {
            ctx.session.user.listingWizard = {
                step: 'category',
                data: {}
            };
            return marketplace.showListingWizard(ctx, 'category');
        }

        return ctx.answerCbQuery('⚠️ Invalid listing creation step');
    },

    // Show listing creation wizard
    async showListingWizard(ctx, step) {
        let stepText = '';
        let keyboard = null;

        switch (step) {
            case 'category':
                stepText = `📂 <b>Create Listing - Step 1/4</b>\n\nSelect a category for your listing:`;
                keyboard = {
                    inline_keyboard: [
                        [
                            { text: '💻 Technology', callback_data: 'market.create.category:technology' },
                            { text: '📈 Marketing', callback_data: 'market.create.category:marketing' }
                        ],
                        [
                            { text: '📊 Analytics', callback_data: 'market.create.category:analytics' },
                            { text: '🎨 Design', callback_data: 'market.create.category:design' }
                        ],
                        [{ text: '❌ Cancel', callback_data: 'market.browse' }]
                    ]
                };
                break;
            case 'title':
                stepText = `📝 <b>Create Listing - Step 2/4</b>\n\nEnter a title for your listing:\n\n<i>Use the menu buttons or type a custom title.</i>`;
                keyboard = {
                    inline_keyboard: [
                        [{ text: '📱 Mobile App Development', callback_data: 'market.create.title:Mobile App Development' }],
                        [{ text: '🎯 Digital Marketing Campaign', callback_data: 'market.create.title:Digital Marketing Campaign' }],
                        [{ text: '📊 Business Analytics Report', callback_data: 'market.create.title:Business Analytics Report' }],
                        [{ text: '⬅️ Back', callback_data: 'market.create.back' }]
                    ]
                };
                break;
            case 'description':
                stepText = `📄 <b>Create Listing - Step 3/4</b>\n\nAdd a description for your listing:\n\n<i>Select a template or customize:</i>`;
                keyboard = {
                    inline_keyboard: [
                        [{ text: '✨ Professional Service', callback_data: 'market.create.desc:Professional service with high quality results' }],
                        [{ text: '🚀 Quick Delivery', callback_data: 'market.create.desc:Fast delivery with excellent customer support' }],
                        [{ text: '💎 Premium Quality', callback_data: 'market.create.desc:Premium quality service with satisfaction guarantee' }],
                        [{ text: '⬅️ Back', callback_data: 'market.create.back' }]
                    ]
                };
                break;
            case 'price':
                stepText = `💲 <b>Create Listing - Step 4/4</b>\n\nSet your price (in Stars):`;
                keyboard = {
                    inline_keyboard: [
                        [
                            { text: '⭐ 50', callback_data: 'market.create.price:50' },
                            { text: '⭐ 100', callback_data: 'market.create.price:100' }
                        ],
                        [
                            { text: '⭐ 200', callback_data: 'market.create.price:200' },
                            { text: '⭐ 500', callback_data: 'market.create.price:500' }
                        ],
                        [{ text: '⬅️ Back', callback_data: 'market.create.back' }]
                    ]
                };
                break;
            case 'preview':
                return marketplace.showListingPreview(ctx);
        }

        return ctx.editMessageText(stepText, {
            parse_mode: 'HTML',
            reply_markup: keyboard
        });
    },

    // Show listing preview and publish
    async showListingPreview(ctx) {
        const listingData = ctx.session.user.listingWizard.data;

        let previewText = `👁️ <b>Listing Preview</b>\n\n`;
        previewText += `<b>${listingData.title}</b>\n\n`;
        previewText += `📝 <b>Description:</b>\n${listingData.description}\n\n`;
        previewText += `💲 <b>Price:</b> ${utils.formatStars(listingData.price)}\n`;
        previewText += `📂 <b>Category:</b> ${listingData.category}\n\n`;
        previewText += `<i>Ready to publish?</i>`;

        const keyboard = {
            inline_keyboard: [
                [{ text: '🎉 Publish Listing', callback_data: 'market.create.publish' }],
                [
                    { text: '✏️ Edit', callback_data: 'market.create.back' },
                    { text: '❌ Cancel', callback_data: 'market.browse' }
                ]
            ]
        };

        return ctx.editMessageText(previewText, {
            parse_mode: 'HTML',
            reply_markup: keyboard
        });
    },

    // Handle filters
    async handleFilters(ctx, params) {
        const filterType = params[0];

        if (filterType === 'menu') {
            const filtersText = `🔍 <b>Marketplace Filters</b>\n\n` +
                              `Refine your search to find exactly what you're looking for.`;

            return ctx.editMessageText(filtersText, {
                parse_mode: 'HTML',
                reply_markup: keyboards.marketplaceFilters()
            });
        }

        return ctx.answerCbQuery('🔍 Filter functionality will be implemented');
    },

    // Handle sorting
    async handleSorting(ctx, sortType) {
        await ctx.answerCbQuery(`📊 Sorting by: ${sortType}`);
        return marketplace.browseListings(ctx, 1);
    }
};

module.exports = { marketplace };
