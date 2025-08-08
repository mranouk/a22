require('dotenv').config();

const config = {
    BOT_TOKEN: process.env.BOT_TOKEN,
    MONGODB_URI: process.env.MONGODB_URI || 'mongodb://localhost:27017/marketplace_bot',
    ADMIN_IDS: (process.env.ADMIN_IDS || '').split(',').map(id => parseInt(id.trim())).filter(Boolean),

    // Feature flags
    ENABLE_PREMIUM: process.env.ENABLE_PREMIUM !== 'false',
    ENABLE_ESCROW: process.env.ENABLE_ESCROW !== 'false',
    ENABLE_BOOSTS: process.env.ENABLE_BOOSTS !== 'false',

    NODE_ENV: process.env.NODE_ENV || 'development',

    // Mock data for demonstration (since no DB in scope)
    mockData: {
        users: new Map(),
        listings: new Map(),
        pendingApprovals: new Map(),
        escrowDeals: new Map(),
        missions: [
            {
                id: 'complete_profile',
                title: 'Complete Your Profile',
                description: 'Fill out all profile information',
                reward: 10,
                progress: 0,
                maxProgress: 1
            },
            {
                id: 'first_listing',
                title: 'Create Your First Listing', 
                description: 'Post your first item to the marketplace',
                reward: 25,
                progress: 0,
                maxProgress: 1
            },
            {
                id: 'referral_program',
                title: 'Invite 3 Friends',
                description: 'Refer 3 friends to join the marketplace',
                reward: 50,
                progress: 0,
                maxProgress: 3
            }
        ]
    }
};

// Validate required config
if (!config.BOT_TOKEN) {
    console.error('❌ BOT_TOKEN is required');
    process.exit(1);
}

if (config.ADMIN_IDS.length === 0) {
    console.warn('⚠️  No admin IDs configured');
}

console.log('✅ Configuration loaded');

module.exports = config;
