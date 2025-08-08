// utils/index.js
const crypto = require('crypto');

const utils = {
    generateId: (prefix = '') => {
        const timestamp = Date.now().toString(36);
        const random = Math.random().toString(36).substr(2, 5);
        return prefix ? `${prefix}_${timestamp}_${random}` : `${timestamp}_${random}`;
    },

    formatStars: (amount) => `⭐ ${amount}`,

    formatDate: (date = new Date()) => {
        return date.toLocaleString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    },

    progressBar: (current, max, length = 5) => {
        const filled = Math.floor((current / max) * length);
        const empty = length - filled;
        return '█'.repeat(filled) + '░'.repeat(empty) + ` ${Math.round((current / max) * 100)}%`;
    },

    truncate: (text, length = 50) => {
        if (text.length <= length) return text;
        return text.substring(0, length) + '...';
    },

    deepClone: (obj) => JSON.parse(JSON.stringify(obj)),

    escapeHTML: (text) => {
        return text
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
    },

    randomChoice: (array) => array[Math.floor(Math.random() * array.length)],

    calculateTrustScore: (profile, completedDeals = 0, disputes = 0) => {
        let score = 0;
        const profileFields = ['sector', 'experience', 'gender', 'age'];
        const completedFields = profileFields.filter(field => profile[field]);
        score += (completedFields.length / profileFields.length) * 40;
        score += Math.min(completedDeals * 2, 40);
        score -= Math.min(disputes * 5, 20);
        return Math.max(0, Math.min(100, Math.round(score)));
    },

    getTrustBadge: (score) => {
        if (score >= 90) return '🏆 Elite';
        if (score >= 75) return '💎 Trusted';
        if (score >= 60) return '⭐ Verified';
        if (score >= 40) return '✅ Basic';
        return '🔰 New';
    },

    sleep: (ms) => new Promise(resolve => setTimeout(resolve, ms)),

    getUserDisplayName: (user) => {
        if (user.username) return `@${user.username}`;
        const parts = [user.first_name, user.last_name].filter(Boolean);
        return parts.length > 0 ? parts.join(' ') : `User ${user.id}`;
    },

    isValidEmail: (email) => {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    },

    generateReferralCode: (userId) => {
        const hash = crypto.createHash('md5').update(userId.toString()).digest('hex');
        return hash.substring(0, 8).toUpperCase();
    },

    formatPriceRange: (min, max) => {
        if (!min && !max) return 'Any price';
        if (!min) return `Up to ⭐ ${max}`;
        if (!max) return `From ⭐ ${min}`;
        return `⭐ ${min} - ${max}`;
    },

    validateStarsAmount: (amount) => {
        const num = parseInt(amount);
        return !isNaN(num) && num > 0 && num <= 1000000;
    }
};

module.exports = { utils };
