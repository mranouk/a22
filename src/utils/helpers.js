const crypto = require('crypto');
const moment = require('moment');

const helpers = {
    // String helpers
    generateId: (length = 8) => {
        return crypto.randomBytes(Math.ceil(length / 2))
            .toString('hex')
            .slice(0, length)
            .toUpperCase();
    },

    generateReferralCode: () => {
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
        let result = '';
        for (let i = 0; i < 8; i++) {
            result += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        return result;
    },

    truncateText: (text, length = 100) => {
        if (!text || text.length <= length) return text;
        return text.substring(0, length - 3) + '...';
    },

    capitalizeFirst: (str) => {
        if (!str) return '';
        return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
    },

    // Array helpers
    paginate: (array, page = 1, limit = 10) => {
        const offset = (page - 1) * limit;
        const paginatedItems = array.slice(offset, offset + limit);
        const totalPages = Math.ceil(array.length / limit);
        
        return {
            data: paginatedItems,
            pagination: {
                currentPage: page,
                totalPages,
                totalItems: array.length,
                hasNext: page < totalPages,
                hasPrev: page > 1,
                limit
            }
        };
    },

    shuffle: (array) => {
        const newArray = [...array];
        for (let i = newArray.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
        }
        return newArray;
    },

    // Object helpers
    pick: (obj, keys) => {
        return keys.reduce((result, key) => {
            if (obj[key] !== undefined) {
                result[key] = obj[key];
            }
            return result;
        }, {});
    },

    omit: (obj, keys) => {
        const result = { ...obj };
        keys.forEach(key => delete result[key]);
        return result;
    },

    // Date helpers
    formatDate: (date, format = 'YYYY-MM-DD HH:mm:ss') => {
        return moment(date).format(format);
    },

    timeAgo: (date) => {
        return moment(date).fromNow();
    },

    addDays: (date, days) => {
        return moment(date).add(days, 'days').toDate();
    },

    isExpired: (date) => {
        return moment().isAfter(moment(date));
    },

    // Number helpers
    formatCurrency: (amount, currency = 'USD') => {
        const formatter = new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: currency,
            minimumFractionDigits: 2,
            maximumFractionDigits: 6
        });
        return formatter.format(amount);
    },

    formatNumber: (number, decimals = 2) => {
        return parseFloat(number).toFixed(decimals);
    },

    generateRandomNumber: (min, max) => {
        return Math.floor(Math.random() * (max - min + 1)) + min;
    },

    // Crypto helpers
    hash: (data) => {
        return crypto.createHash('sha256').update(data).digest('hex');
    },

    encrypt: (text, key) => {
        const algorithm = 'aes-256-gcm';
        const iv = crypto.randomBytes(16);
        const cipher = crypto.createCipher(algorithm, key);
        
        let encrypted = cipher.update(text, 'utf8', 'hex');
        encrypted += cipher.final('hex');
        
        return {
            iv: iv.toString('hex'),
            data: encrypted
        };
    },

    decrypt: (encryptedData, key) => {
        const algorithm = 'aes-256-gcm';
        const decipher = crypto.createDecipher(algorithm, key);
        
        let decrypted = decipher.update(encryptedData.data, 'hex', 'utf8');
        decrypted += decipher.final('utf8');
        
        return decrypted;
    },

    // Telegram helpers
    escapeMarkdown: (text) => {
        return text.replace(/[_*[\]()~`>#+=|{}.!-]/g, '\\$&');
    },

    createInlineKeyboard: (buttons) => {
        return {
            reply_markup: {
                inline_keyboard: buttons
            }
        };
    },

    createButton: (text, callbackData) => {
        return {
            text,
            callback_data: callbackData
        };
    },

    createUrlButton: (text, url) => {
        return {
            text,
            url
        };
    },

    // Progress bar helper
    createProgressBar: (current, total, length = 20) => {
        const progress = Math.round((current / total) * length);
        const emptyProgress = length - progress;
        
        const progressText = '▓'.repeat(progress);
        const emptyProgressText = '░'.repeat(emptyProgress);
        
        return progressText + emptyProgressText;
    },

    // Validation helpers
    isValidJSON: (str) => {
        try {
            JSON.parse(str);
            return true;
        } catch (e) {
            return false;
        }
    },

    isValidUrl: (str) => {
        try {
            new URL(str);
            return true;
        } catch (e) {
            return false;
        }
    },

    // Sleep helper for delays
    sleep: (ms) => {
        return new Promise(resolve => setTimeout(resolve, ms));
    },

    // Deep clone helper
    deepClone: (obj) => {
        return JSON.parse(JSON.stringify(obj));
    },

    // Error handling helper
    safeExecute: async (fn, defaultValue = null) => {
        try {
            return await fn();
        } catch (error) {
            console.error('Safe execution failed:', error);
            return defaultValue;
        }
    },

    // Rate limiting helper
    createRateLimitKey: (userId, action) => {
        return `rate_limit:${action}:${userId}`;
    },

    // Emoji helpers
    getRandomEmoji: (emojiArray) => {
        return emojiArray[Math.floor(Math.random() * emojiArray.length)];
    },

    // File size formatter
    formatFileSize: (bytes) => {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }
};

module.exports = helpers;
