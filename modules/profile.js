const { templates } = require('../ui/templates');
const { keyboards } = require('../ui/keyboards');
const config = require('../config');
const { utils } = require('../utils');
const { onboarding } = require('./onboarding');

const profile = {
    // Handle profile actions
    async handleAction(ctx) {
        const action = ctx.match[1]; // Everything after "user.profile."
        const [actionType, ...params] = action.split('.');

        switch (actionType) {
            case 'view':
                return profile.showProfile(ctx);
            case 'setup':
            case 'wizard':
                return profile.handleWizard(ctx, params);
            case 'sector':
                return profile.selectSector(ctx, params[0]);
            case 'experience':
                return profile.selectExperience(ctx, params[0]);
            case 'gender':
                return profile.selectGender(ctx, params[0]);
            case 'age':
                return profile.selectAge(ctx, params[0]);
            case 'referral':
                return profile.handleReferral(ctx, params);
            case 'edit':
                return profile.editProfile(ctx, params);
            default:
                return ctx.answerCbQuery('⚠️ Profile action not found');
        }
    },

    // Show user profile
    async showProfile(ctx) {
        const access = onboarding.checkUserAccess(ctx);
        if (!access.allowed) {
            return ctx.replyWithHTML(templates.error(access.reason));
        }

        const userData = access.userData;
        const profile = userData.profile;

        let profileText = `👤 <b>Your Profile</b>\n\n`;
        profileText += `🎭 <b>Role:</b> ${userData.role}\n`;
        profileText += `📊 <b>Trust Score:</b> ${utils.getTrustBadge(userData.trustScore)} (${userData.trustScore}/100)\n\n`;

        profileText += `📋 <b>Profile Information:</b>\n`;
        profileText += `🏢 <b>Sector:</b> ${profile.sector || '❓ Not set'}\n`;
        profileText += `💼 <b>Experience:</b> ${profile.experience || '❓ Not set'}\n`;
        profileText += `👥 <b>Gender:</b> ${profile.gender || '❓ Not set'}\n`;
        profileText += `🎂 <b>Age Group:</b> ${profile.age || '❓ Not set'}\n\n`;

        if (profile.referralCode) {
            profileText += `🔗 <b>Referral Code:</b> <code>${profile.referralCode}</code>\n`;
        }

        profileText += `📅 <b>Member Since:</b> ${utils.formatDate(userData.createdAt)}`;

        const keyboard = [
            [{ text: '✏️ Edit Profile', callback_data: 'user.profile.edit' }],
            [{ text: '⬅️ Back to Menu', callback_data: 'user.home' }]
        ];

        if (ctx.callbackQuery) {
            return ctx.editMessageText(profileText, {
                parse_mode: 'HTML',
                reply_markup: { inline_keyboard: keyboard }
            });
        } else {
            return ctx.replyWithHTML(profileText, {
                reply_markup: { inline_keyboard: keyboard }
            });
        }
    },

    // Handle profile wizard
    async handleWizard(ctx, params) {
        const access = onboarding.checkUserAccess(ctx);
        if (!access.allowed) {
            return ctx.replyWithHTML(templates.error(access.reason));
        }

        const action = params[0];

        if (action === 'back') {
            return profile.handleWizardBack(ctx);
        }

        // Start profile setup wizard
        ctx.session.user.currentWizardStep = 'sector';
        ctx.session.user.wizardData = {};

        return profile.showWizardStep(ctx, 'sector');
    },

    // Show wizard step
    async showWizardStep(ctx, step) {
        let stepText = '';
        let keyboard = null;

        switch (step) {
            case 'sector':
                stepText = `🏢 <b>Profile Setup - Step 1/4</b>\n\nSelect your primary sector:`;
                keyboard = keyboards.profileSectors();
                break;
            case 'experience':
                stepText = `💼 <b>Profile Setup - Step 2/4</b>\n\nHow much experience do you have?`;
                keyboard = keyboards.profileExperience();
                break;
            case 'gender':
                stepText = `👥 <b>Profile Setup - Step 3/4</b>\n\nSelect your gender:`;
                keyboard = keyboards.profileGender();
                break;
            case 'age':
                stepText = `🎂 <b>Profile Setup - Step 4/4</b>\n\nSelect your age group:`;
                keyboard = keyboards.profileAge();
                break;
            case 'referral':
                stepText = `🔗 <b>Referral Code (Optional)</b>\n\nDo you have a referral code?`;
                keyboard = keyboards.confirmCancel('user.profile.referral.add', 'user.profile.wizard.complete');
                break;
            case 'complete':
                return profile.completeWizard(ctx);
        }

        if (ctx.callbackQuery) {
            return ctx.editMessageText(stepText, {
                parse_mode: 'HTML',
                reply_markup: keyboard
            });
        } else {
            return ctx.replyWithHTML(stepText, { reply_markup: keyboard });
        }
    },

    // Select sector
    async selectSector(ctx, sectorData) {
        const sector = sectorData.split(':')[1];
        const sectorNames = {
            'technology': 'Technology',
            'finance': 'Finance', 
            'healthcare': 'Healthcare',
            'education': 'Education',
            'ecommerce': 'E-commerce',
            'construction': 'Construction'
        };

        ctx.session.user.wizardData.sector = sectorNames[sector] || sector;
        ctx.session.user.currentWizardStep = 'experience';

        await ctx.answerCbQuery(`✅ Selected: ${sectorNames[sector]}`);
        return profile.showWizardStep(ctx, 'experience');
    },

    // Select experience
    async selectExperience(ctx, expData) {
        const experience = expData.split(':')[1];
        const expNames = {
            '0-6m': '0-6 months',
            '6-12m': '6-12 months',
            '1-3y': '1-3 years',
            '3-5y': '3-5 years',
            '5+y': '5+ years',
            'expert': 'Expert (10+)'
        };

        ctx.session.user.wizardData.experience = expNames[experience] || experience;
        ctx.session.user.currentWizardStep = 'gender';

        await ctx.answerCbQuery(`✅ Selected: ${expNames[experience]}`);
        return profile.showWizardStep(ctx, 'gender');
    },

    // Select gender
    async selectGender(ctx, genderData) {
        const gender = genderData.split(':')[1];
        const genderNames = {
            'male': 'Male',
            'female': 'Female',
            'other': 'Other',
            'private': 'Prefer not to say'
        };

        ctx.session.user.wizardData.gender = genderNames[gender] || gender;
        ctx.session.user.currentWizardStep = 'age';

        await ctx.answerCbQuery(`✅ Selected: ${genderNames[gender]}`);
        return profile.showWizardStep(ctx, 'age');
    },

    // Select age
    async selectAge(ctx, ageData) {
        const age = ageData.split(':')[1];
        const ageNames = {
            '18-24': '18-24 years',
            '25-34': '25-34 years',
            '35-44': '35-44 years',
            '45-54': '45-54 years',
            '55+': '55+ years',
            'private': 'Prefer not to say'
        };

        ctx.session.user.wizardData.age = ageNames[age] || age;
        ctx.session.user.currentWizardStep = 'referral';

        await ctx.answerCbQuery(`✅ Selected: ${ageNames[age]}`);
        return profile.showWizardStep(ctx, 'referral');
    },

    // Handle referral code
    async handleReferral(ctx, params) {
        const action = params[0];

        if (action === 'add') {
            // For simplicity, we'll skip actual referral code input and use a mock code
            ctx.session.user.wizardData.referralCode = 'DEMO2024';
            await ctx.answerCbQuery('✅ Referral code added!');
        }

        return profile.completeWizard(ctx);
    },

    // Complete profile wizard
    async completeWizard(ctx) {
        const userId = ctx.from.id;
        const userData = config.mockData.users.get(userId);

        if (!userData) {
            return ctx.replyWithHTML(templates.error('User data not found'));
        }

        // Update user profile
        userData.profile = {
            ...userData.profile,
            ...ctx.session.user.wizardData
        };

        // Generate referral code if not set
        if (!userData.profile.referralCode) {
            userData.profile.referralCode = utils.generateReferralCode(userId);
        }

        // Calculate trust score
        userData.trustScore = utils.calculateTrustScore(userData.profile);
        userData.profileCompleted = true;
        userData.profileCompletedAt = new Date();

        // Save user data
        config.mockData.users.set(userId, userData);

        // Clear wizard state
        ctx.session.user.currentWizardStep = null;
        ctx.session.user.wizardData = {};

        // Show completion message
        await ctx.editMessageText(
            templates.profileComplete(),
            {
                parse_mode: 'HTML',
                reply_markup: keyboards.backButton('user.home')
            }
        );

        return ctx.answerCbQuery('🎉 Profile setup complete!');
    },

    // Handle wizard back button
    async handleWizardBack(ctx) {
        const currentStep = ctx.session.user.currentWizardStep;
        let previousStep = null;

        switch (currentStep) {
            case 'experience':
                previousStep = 'sector';
                break;
            case 'gender':
                previousStep = 'experience';
                break;
            case 'age':
                previousStep = 'gender';
                break;
            case 'referral':
                previousStep = 'age';
                break;
            default:
                return onboarding.showMainMenu(ctx);
        }

        ctx.session.user.currentWizardStep = previousStep;
        return profile.showWizardStep(ctx, previousStep);
    },

    // Edit profile (simplified version)
    async editProfile(ctx, params) {
        const editText = `✏️ <b>Edit Profile</b>\n\n` +
                        `Select a field to edit:\n\n` +
                        `<i>⚠️ Note: Changes to restricted fields require admin approval.</i>`;

        const keyboard = [
            [{ text: '🏢 Edit Sector', callback_data: 'user.profile.edit.sector' }],
            [{ text: '💼 Edit Experience', callback_data: 'user.profile.edit.experience' }],
            [{ text: '⬅️ Back to Profile', callback_data: 'user.profile.view' }]
        ];

        return ctx.editMessageText(editText, {
            parse_mode: 'HTML',
            reply_markup: { inline_keyboard: keyboard }
        });
    },

    // Handle text input during wizard
    async handleTextInput(ctx) {
        const step = ctx.session.user.currentWizardStep;

        if (step === 'referral_code') {
            const referralCode = ctx.message.text.trim().toUpperCase();

            if (referralCode.length >= 6 && referralCode.length <= 12) {
                ctx.session.user.wizardData.referralCode = referralCode;
                await ctx.replyWithHTML('✅ Referral code saved!');
                return profile.completeWizard(ctx);
            } else {
                return ctx.replyWithHTML(
                    '⚠️ Invalid referral code. Please enter a code between 6-12 characters.',
                    {
                        reply_markup: keyboards.backButton('user.profile.wizard.back')
                    }
                );
            }
        }

        return ctx.replyWithHTML(
            'ℹ️ Please use the menu buttons to make your selection.',
            {
                reply_markup: keyboards.backButton('user.home')
            }
        );
    }
};

module.exports = { profile };
