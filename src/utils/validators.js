const { ROLES, SECTORS, GENDERS, EXPERIENCE_LEVELS } = require('./constants');

class ValidationError extends Error {
    constructor(message, field = null) {
        super(message);
        this.name = 'ValidationError';
        this.field = field;
    }
}

const validators = {
    // User validation
    validateTelegramId: (telegramId) => {
        if (!telegramId || typeof telegramId !== 'number') {
            throw new ValidationError('❌ Invalid Telegram ID', 'telegramId');
        }
        if (telegramId <= 0) {
            throw new ValidationError('❌ Telegram ID must be positive', 'telegramId');
        }
        return true;
    },

    validateUsername: (username) => {
        if (!username || typeof username !== 'string') {
            throw new ValidationError('❌ Username is required', 'username');
        }
        if (username.length < 3 || username.length > 32) {
            throw new ValidationError('❌ Username must be between 3-32 characters', 'username');
        }
        if (!/^[a-zA-Z0-9_]+$/.test(username)) {
            throw new ValidationError('❌ Username can only contain letters, numbers, and underscores', 'username');
        }
        return true;
    },

    validateRole: (role) => {
        if (!role || !ROLES.includes(role)) {
            throw new ValidationError(`❌ Invalid role. Must be one of: ${ROLES.join(', ')}`, 'role');
        }
        return true;
    },

    // Profile validation
    validateAge: (age) => {
        const ageNum = parseInt(age);
        if (isNaN(ageNum) || ageNum < 18 || ageNum > 100) {
            throw new ValidationError('❌ Age must be between 18-100 years', 'age');
        }
        return true;
    },

    validateGender: (gender) => {
        if (!gender || !GENDERS.includes(gender)) {
            throw new ValidationError(`❌ Invalid gender. Must be one of: ${GENDERS.join(', ')}`, 'gender');
        }
        return true;
    },

    validateSector: (sector) => {
        if (!sector || !SECTORS.includes(sector)) {
            throw new ValidationError(`❌ Invalid sector. Must be one of: ${SECTORS.join(', ')}`, 'sector');
        }
        return true;
    },

    validateExperience: (experience) => {
        if (!experience || !EXPERIENCE_LEVELS.includes(experience)) {
            throw new ValidationError(`❌ Invalid experience level. Must be one of: ${EXPERIENCE_LEVELS.join(', ')}`, 'experience');
        }
        return true;
    },

    // Listing validation
    validateListingTitle: (title) => {
        if (!title || typeof title !== 'string') {
            throw new ValidationError('❌ Listing title is required', 'title');
        }
        if (title.length < 5 || title.length > 100) {
            throw new ValidationError('❌ Title must be between 5-100 characters', 'title');
        }
        return true;
    },

    validateListingDescription: (description) => {
        if (!description || typeof description !== 'string') {
            throw new ValidationError('❌ Description is required', 'description');
        }
        if (description.length < 20 || description.length > 1000) {
            throw new ValidationError('❌ Description must be between 20-1000 characters', 'description');
        }
        return true;
    },

    validatePrice: (price) => {
        const priceNum = parseFloat(price);
        if (isNaN(priceNum) || priceNum < 0.01 || priceNum > 1000000) {
            throw new ValidationError('❌ Price must be between $0.01 - $1,000,000', 'price');
        }
        return true;
    },

    // Crypto validation
    validateEthereumAddress: (address) => {
        if (!address || typeof address !== 'string') {
            throw new ValidationError('❌ Ethereum address is required', 'address');
        }
        if (!/^0x[a-fA-F0-9]{40}$/.test(address)) {
            throw new ValidationError('❌ Invalid Ethereum address format', 'address');
        }
        return true;
    },

    validateAmount: (amount) => {
        const amountNum = parseFloat(amount);
        if (isNaN(amountNum) || amountNum <= 0) {
            throw new ValidationError('❌ Amount must be greater than 0', 'amount');
        }
        return true;
    },

    // Referral validation
    validateReferralCode: (code) => {
        if (!code) return true; // Optional field
        if (typeof code !== 'string' || code.length !== 8) {
            throw new ValidationError('❌ Invalid referral code format', 'referralCode');
        }
        if (!/^[A-Z0-9]{8}$/.test(code)) {
            throw new ValidationError('❌ Referral code must be 8 characters (A-Z, 0-9)', 'referralCode');
        }
        return true;
    },

    // Message validation
    validateMessage: (message, maxLength = 500) => {
        if (!message || typeof message !== 'string') {
            throw new ValidationError('❌ Message is required', 'message');
        }
        if (message.length > maxLength) {
            throw new ValidationError(`❌ Message too long (max ${maxLength} characters)`, 'message');
        }
        return true;
    },

    // Generic validation helpers
    validateRequired: (value, fieldName) => {
        if (!value || (typeof value === 'string' && value.trim() === '')) {
            throw new ValidationError(`❌ ${fieldName} is required`, fieldName);
        }
        return true;
    },

    validateEmail: (email) => {
        if (!email) return true; // Optional field
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            throw new ValidationError('❌ Invalid email format', 'email');
        }
        return true;
    },

    validatePhoneNumber: (phone) => {
        if (!phone) return true; // Optional field
        const phoneRegex = /^\+?[\d\s\-\(\)]{10,15}$/;
        if (!phoneRegex.test(phone)) {
            throw new ValidationError('❌ Invalid phone number format', 'phone');
        }
        return true;
    },

    // Sanitization helpers
    sanitizeString: (str, maxLength = 1000) => {
        if (!str || typeof str !== 'string') return '';
        return str.trim().substring(0, maxLength);
    },

    sanitizeHtml: (str) => {
        if (!str || typeof str !== 'string') return '';
        return str
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#x27;')
            .replace(/\//g, '&#x2F;');
    }
};

module.exports = {
    validators,
    ValidationError
};
