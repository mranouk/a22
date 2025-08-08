const { templates } = require('../ui/templates');
const { keyboards } = require('../ui/keyboards');
const config = require('../config');
const { utils } = require('../utils');
const { onboarding } = require('./onboarding');

const missions = {
    // Handle mission actions
    async handleAction(ctx) {
        const action = ctx.match[1]; // Everything after "missions."
        const [actionType, ...params] = action.split('.');

        switch (actionType) {
            case 'open':
                return missions.showMissions(ctx);
            case 'claim':
                return missions.claimReward(ctx, params[0]);
            case 'refresh':
                return missions.refreshMissions(ctx);
            default:
                return ctx.answerCbQuery('⚠️ Mission action not found');
        }
    },

    // Show missions and rewards
    async showMissions(ctx) {
        const access = onboarding.checkUserAccess(ctx);
        if (!access.allowed) {
            return ctx.replyWithHTML(templates.error(access.reason));
        }

        const userId = ctx.from.id;
        const userData = config.mockData.users.get(userId);

        // Update mission progress based on user data
        const missions = config.mockData.missions.map(mission => {
            const updatedMission = { ...mission };

            switch (mission.id) {
                case 'complete_profile':
                    updatedMission.progress = userData.profileCompleted ? 1 : 0;
                    break;
                case 'first_listing':
                    const userListings = Array.from(config.mockData.listings.values())
                        .filter(listing => listing.sellerId === userId);
                    updatedMission.progress = userListings.length > 0 ? 1 : 0;
                    break;
                case 'referral_program':
                    // Mock referral progress
                    updatedMission.progress = 1; // Demo value
                    break;
            }

            return updatedMission;
        });

        let missionsText = `🎮 <b>Missions & Rewards</b>\n\n`;
        missionsText += `Complete missions to earn Stars and unlock features!\n\n`;

        missions.forEach((mission, index) => {
            const progressBar = utils.progressBar(mission.progress, mission.maxProgress);
            const isComplete = mission.progress >= mission.maxProgress;
            const statusIcon = isComplete ? '✅' : '🎯';

            missionsText += `${statusIcon} <b>${mission.title}</b>\n`;
            missionsText += `${mission.description}\n`;
            missionsText += `Progress: ${progressBar}\n`;
            missionsText += `Reward: ${utils.formatStars(mission.reward)}\n\n`;
        });

        // Build keyboard with claim buttons
        const keyboard = [];
        const completedMissions = missions.filter(m => m.progress >= m.maxProgress);

        if (completedMissions.length > 0) {
            completedMissions.forEach(mission => {
                keyboard.push([{
                    text: `✅ Claim ${mission.title}`,
                    callback_data: `missions.claim:${mission.id}`
                }]);
            });
        }

        keyboard.push([
            { text: '🔄 Refresh', callback_data: 'missions.refresh' },
            { text: '⬅️ Back to Menu', callback_data: 'user.home' }
        ]);

        if (ctx.callbackQuery) {
            return ctx.editMessageText(missionsText, {
                parse_mode: 'HTML',
                reply_markup: { inline_keyboard: keyboard }
            });
        } else {
            return ctx.replyWithHTML(missionsText, {
                reply_markup: { inline_keyboard: keyboard }
            });
        }
    },

    // Claim mission reward
    async claimReward(ctx, missionId) {
        const mission = config.mockData.missions.find(m => m.id === missionId);

        if (!mission) {
            return ctx.answerCbQuery('⚠️ Mission not found');
        }

        const userId = ctx.from.id;
        const userData = config.mockData.users.get(userId);

        // Add reward to wallet
        userData.walletBalance = (userData.walletBalance || 0) + mission.reward;
        config.mockData.users.set(userId, userData);

        // Mark mission as claimed (in a real app, you'd track this)

        await ctx.answerCbQuery(`🎉 Claimed ${mission.reward} Stars!`);

        const rewardText = `🎉 <b>Mission Complete!</b>\n\n` +
                         `${mission.title}\n\n` +
                         `Reward: ${utils.formatStars(mission.reward)}\n` +
                         `New Balance: ${utils.formatStars(userData.walletBalance)}`;

        return ctx.replyWithHTML(rewardText, {
            reply_markup: keyboards.backButton('missions.open')
        });
    },

    // Refresh mission progress
    async refreshMissions(ctx) {
        await ctx.answerCbQuery('🔄 Mission progress updated!');
        return missions.showMissions(ctx);
    }
};

module.exports = { missions };