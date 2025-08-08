const { Markup } = require('telegraf');

const keyboards = {
    // Role selection keyboard
    roleSelection: () => {
        return Markup.inlineKeyboard([
            [Markup.button.callback('🛍️ Buyer', 'user.role.select:buyer')],
            [Markup.button.callback('🏷️ Vendor', 'user.role.select:vendor')], 
            [Markup.button.callback('📞 Caller', 'user.role.select:caller')],
            [Markup.button.callback('🤝 Partner', 'user.role.select:partner')]
        ]);
    },

    // Main menu keyboard
    mainMenu: () => {
        return Markup.inlineKeyboard([
            [
                Markup.button.callback('🏠 Marketplace', 'market.browse'),
                Markup.button.callback('👤 Profile', 'user.profile.view')
            ],
            [
                Markup.button.callback('💸 Wallet', 'wallet.open'),
                Markup.button.callback('🚀 Boost', 'boosts.open')
            ],
            [
                Markup.button.callback('🤝 Referrals', 'referrals.open'),
                Markup.button.callback('📊 Trust Score', 'trust.open')
            ],
            [
                Markup.button.callback('🎮 Missions', 'missions.open'),
                Markup.button.callback('📲 Notifications', 'notifications.open')
            ],
            [Markup.button.callback('🛡️ Support', 'support.open')]
        ]);
    },

    // Admin menu keyboard
    adminMenu: () => {
        return Markup.inlineKeyboard([
            [
                Markup.button.callback('🗂️ Approvals', 'admin.approvals.page:1'),
                Markup.button.callback('📢 Broadcast', 'admin.broadcast.start')
            ],
            [
                Markup.button.callback('📋 Requests', 'admin.requests.page:1'),
                Markup.button.callback('🛡️ Audit Log', 'admin.logs.page:1')
            ],
            [Markup.button.callback('⬅️ Back to Main', 'user.home')]
        ]);
    },

    // Marketplace filters
    marketplaceFilters: (currentFilters = {}) => {
        return Markup.inlineKeyboard([
            [
                Markup.button.callback('🔎 Sector', 'market.filter.sector'),
                Markup.button.callback('💲 Price Range', 'market.filter.price')
            ],
            [
                Markup.button.callback('📊 Sort: Recent', 'market.sort.recent'),
                Markup.button.callback('⭐ Sort: Trust', 'market.sort.trust')
            ],
            [Markup.button.callback('🔄 Clear Filters', 'market.filter.clear')],
            [Markup.button.callback('⬅️ Back', 'market.browse')]
        ]);
    },

    // Pagination controls
    pagination: (currentPage, totalPages, baseCallback) => {
        const buttons = [];

        if (totalPages > 1) {
            const row = [];
            if (currentPage > 1) {
                row.push(Markup.button.callback('◀️ Previous', `${baseCallback}:${currentPage - 1}`));
            }

            row.push(Markup.button.callback(`${currentPage}/${totalPages}`, 'noop'));

            if (currentPage < totalPages) {
                row.push(Markup.button.callback('▶️ Next', `${baseCallback}:${currentPage + 1}`));
            }

            buttons.push(row);
        }

        return buttons;
    },

    // Profile wizard steps
    profileSectors: () => {
        return Markup.inlineKeyboard([
            [
                Markup.button.callback('💻 Technology', 'profile.sector:technology'),
                Markup.button.callback('🏦 Finance', 'profile.sector:finance')
            ],
            [
                Markup.button.callback('🏥 Healthcare', 'profile.sector:healthcare'),
                Markup.button.callback('🎓 Education', 'profile.sector:education')
            ],
            [
                Markup.button.callback('🛒 E-commerce', 'profile.sector:ecommerce'),
                Markup.button.callback('🏗️ Construction', 'profile.sector:construction')
            ],
            [Markup.button.callback('⬅️ Back', 'user.profile.wizard.back')]
        ]);
    },

    profileExperience: () => {
        return Markup.inlineKeyboard([
            [
                Markup.button.callback('👶 0-6 months', 'profile.experience:0-6m'),
                Markup.button.callback('🌱 6-12 months', 'profile.experience:6-12m')
            ],
            [
                Markup.button.callback('📈 1-3 years', 'profile.experience:1-3y'),
                Markup.button.callback('💪 3-5 years', 'profile.experience:3-5y')
            ],
            [
                Markup.button.callback('🏆 5+ years', 'profile.experience:5+y'),
                Markup.button.callback('🎯 Expert (10+)', 'profile.experience:expert')
            ],
            [Markup.button.callback('⬅️ Back', 'user.profile.wizard.back')]
        ]);
    },

    profileGender: () => {
        return Markup.inlineKeyboard([
            [
                Markup.button.callback('♂️ Male', 'profile.gender:male'),
                Markup.button.callback('♀️ Female', 'profile.gender:female')
            ],
            [
                Markup.button.callback('⚧ Other', 'profile.gender:other'),
                Markup.button.callback('🤐 Prefer not to say', 'profile.gender:private')
            ],
            [Markup.button.callback('⬅️ Back', 'user.profile.wizard.back')]
        ]);
    },

    profileAge: () => {
        return Markup.inlineKeyboard([
            [
                Markup.button.callback('🎓 18-24', 'profile.age:18-24'),
                Markup.button.callback('💼 25-34', 'profile.age:25-34')
            ],
            [
                Markup.button.callback('🏢 35-44', 'profile.age:35-44'),
                Markup.button.callback('👔 45-54', 'profile.age:45-54')
            ],
            [
                Markup.button.callback('🎯 55+', 'profile.age:55+'),
                Markup.button.callback('🤐 Prefer not to say', 'profile.age:private')
            ],
            [Markup.button.callback('⬅️ Back', 'user.profile.wizard.back')]
        ]);
    },

    // Back/Next/Cancel controls
    backButton: (callback) => {
        return Markup.inlineKeyboard([
            [Markup.button.callback('⬅️ Back', callback)]
        ]);
    },

    backNextCancel: (backCallback, nextCallback, cancelCallback = 'user.home') => {
        return Markup.inlineKeyboard([
            [
                Markup.button.callback('⬅️ Back', backCallback),
                Markup.button.callback('➡️ Next', nextCallback)
            ],
            [Markup.button.callback('❌ Cancel', cancelCallback)]
        ]);
    },

    confirmCancel: (confirmCallback, cancelCallback = 'user.home') => {
        return Markup.inlineKeyboard([
            [
                Markup.button.callback('✅ Confirm', confirmCallback),
                Markup.button.callback('❌ Cancel', cancelCallback)
            ]
        ]);
    },

    // Approval actions for admin
    approvalActions: (approvalId, type = 'role') => {
        return Markup.inlineKeyboard([
            [
                Markup.button.callback('✅ Approve', `admin.approve:${type}:${approvalId}`),
                Markup.button.callback('❌ Reject', `admin.reject:${type}:${approvalId}`)
            ]
        ]);
    }
};

module.exports = { keyboards };
