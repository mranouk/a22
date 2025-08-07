// src/services/referralService.js
const mongoose = require('mongoose');
const User = require('../models/user');
const Referral = require('../models/referral');
const Wallet = require('../models/wallet');
const notificationService = require('./notificationService');
const walletService = require('./walletService');
const logger = require('../utils/logger');

const referralService = {
    // Create a new referral record
    async createReferral(data) {
        try {
            const referral = new Referral({
                referrer: data.referrerId,
                referred: data.referredUserId,
                referralCode: data.referralCode,
                status: data.status || 'pending',
                joinedAt: data.createdAt || new Date()
            });

            await referral.save();
            return referral;
        } catch (error) {
            logger.error('Create referral error', error);
            throw error;
        }
    },

    // Find referral by referred user ID
    async findReferral(referredUserId) {
        try {
            return await Referral.findOne({ referred: referredUserId })
                .populate('referrer', 'username tgid')
                .populate('referred', 'username tgid');
        } catch (error) {
            logger.error('Find referral error', error);
            throw error;
        }
    },

    // Get user referral statistics
    async getUserReferralStats(userId) {
        try {
            const referrals = await Referral.find({ referrer: userId });
            const activeReferrals = referrals.filter(r => r.status === 'active').length;
            
            // Calculate total earnings from referrals
            const totalEarnings = referrals.reduce((sum, r) => {
                return sum + (r.totalEarned || 0);
            }, 0);

            // Calculate available rewards (pending bonuses)
            const availableRewards = referrals.reduce((sum, r) => {
                return sum + (r.pendingBonus || 0);
            }, 0);

            return {
                totalReferrals: referrals.length,
                activeReferrals,
                totalEarnings,
                availableRewards
            };
        } catch (error) {
            logger.error('Get user referral stats error', error);
            throw error;
        }
    },

    // Get detailed referral statistics
    async getDetailedStats(userId) {
        try {
            const now = new Date();
            const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
            
            const allTimeReferrals = await Referral.find({ referrer: userId });
            const thisMonthReferrals = await Referral.find({ 
                referrer: userId,
                joinedAt: { $gte: thisMonthStart }
            });

            const allTimeStats = {
                totalReferrals: allTimeReferrals.length,
                activeReferrals: allTimeReferrals.filter(r => r.status === 'active').length,
                totalEarnings: allTimeReferrals.reduce((sum, r) => sum + (r.totalEarned || 0), 0),
                successRate: allTimeReferrals.length > 0 ? 
                    (allTimeReferrals.filter(r => r.status === 'active').length / allTimeReferrals.length * 100).toFixed(1) : 0
            };

            const thisMonthStats = {
                newReferrals: thisMonthReferrals.length,
                earnings: thisMonthReferrals.reduce((sum, r) => sum + (r.totalEarned || 0), 0),
                conversionRate: thisMonthReferrals.length > 0 ? 
                    (thisMonthReferrals.filter(r => r.status === 'active').length / thisMonthReferrals.length * 100).toFixed(1) : 0
            };

            // Get user's rank among all referrers
            const allReferrers = await Referral.aggregate([
                { $group: { _id: '$referrer', count: { $sum: 1 } } },
                { $sort: { count: -1 } }
            ]);

            const userRankIndex = allReferrers.findIndex(r => r._id.toString() === userId.toString());
            const rank = userRankIndex >= 0 ? userRankIndex + 1 : null;

            // Determine level based on total referrals
            let level = 'Beginner';
            if (allTimeStats.totalReferrals >= 50) level = 'Master';
            else if (allTimeStats.totalReferrals >= 20) level = 'Expert';
            else if (allTimeStats.totalReferrals >= 10) level = 'Advanced';
            else if (allTimeStats.totalReferrals >= 5) level = 'Intermediate';

            return {
                allTime: allTimeStats,
                thisMonth: thisMonthStats,
                rank,
                level
            };
        } catch (error) {
            logger.error('Get detailed stats error', error);
            throw error;
        }
    },

    // Get user's referrals with pagination
    async getUserReferrals(userId, limit = 10, offset = 0) {
        try {
            const total = await Referral.countDocuments({ referrer: userId });
            const referrals = await Referral.find({ referrer: userId })
                .populate('referred', 'username tgid createdAt')
                .sort({ joinedAt: -1 })
                .skip(offset)
                .limit(limit);

            const data = referrals.map(r => ({
                id: r._id,
                username: r.referred?.username || 'Anonymous',
                joinedAt: r.joinedAt,
                status: r.status,
                totalEarned: r.totalEarned || 0
            }));

            return {
                data,
                total,
                hasMore: offset + limit < total
            };
        } catch (error) {
            logger.error('Get user referrals error', error);
            throw error;
        }
    },

    // Get earnings breakdown
    async getEarningsBreakdown(userId) {
        try {
            const referrals = await Referral.find({ referrer: userId });
            
            let available = 0;
            let pending = 0;
            let claimed = 0;
            let registrationBonus = 0;
            let firstPurchaseBonus = 0;
            let commissions = 0;
            let bonuses = 0;

            referrals.forEach(r => {
                available += r.pendingBonus || 0;
                claimed += r.totalClaimed || 0;
                registrationBonus += r.registrationBonus || 0;
                firstPurchaseBonus += r.firstPurchaseBonus || 0;
                commissions += r.totalCommissions || 0;
                bonuses += r.specialBonuses || 0;
            });

            return {
                available,
                pending,
                claimed,
                registrationBonus,
                firstPurchaseBonus,
                commissions,
                bonuses
            };
        } catch (error) {
            logger.error('Get earnings breakdown error', error);
            throw error;
        }
    },

    // Claim available rewards
    async claimRewards(userId) {
        try {
            const referrals = await Referral.find({ 
                referrer: userId,
                pendingBonus: { $gt: 0 }
            });

            if (!referrals.length) {
                return { success: true, amount: 0 };
            }

            let totalAmount = 0;
            for (const referral of referrals) {
                totalAmount += referral.pendingBonus;
                referral.totalClaimed = (referral.totalClaimed || 0) + referral.pendingBonus;
                referral.pendingBonus = 0;
                await referral.save();
            }

            // Add to user's wallet
            if (totalAmount > 0) {
                await walletService.transferFunds(
                    'system',
                    userId,
                    totalAmount,
                    'Referral rewards claimed'
                );
            }

            return { success: true, amount: totalAmount };
        } catch (error) {
            logger.error('Claim rewards error', error);
            return { success: false, error: 'Failed to claim rewards' };
        }
    },

    // Update referral record
    async updateReferral(referralId, updates) {
        try {
            const referral = await Referral.findByIdAndUpdate(
                referralId,
                { $set: updates },
                { new: true }
            );
            return referral;
        } catch (error) {
            logger.error('Update referral error', error);
            throw error;
        }
    },

    // Update referral stats (add to existing totals)
    async updateReferralStats(referralId, stats) {
        try {
            const updates = {};
            if (stats.totalCommissions) {
                updates.$inc = { totalCommissions: stats.totalCommissions };
            }
            if (stats.totalTransactionVolume) {
                updates.$inc = { 
                    ...updates.$inc,
                    totalTransactionVolume: stats.totalTransactionVolume 
                };
            }

            const referral = await Referral.findByIdAndUpdate(
                referralId,
                updates,
                { new: true }
            );
            return referral;
        } catch (error) {
            logger.error('Update referral stats error', error);
            throw error;
        }
    },

    // Record bonus payment
    async recordBonus(userId, amount, type, description) {
        try {
            // This could be stored in a separate bonus tracking collection
            // For now, we'll just log it
            logger.audit('referral_bonus_recorded', userId, {
                amount,
                type,
                description
            });
            return true;
        } catch (error) {
            logger.error('Record bonus error', error);
            throw error;
        }
    },

    // Get top referrers for monthly bonuses
    async getTopReferrers(limit = 10) {
        try {
            const now = new Date();
            const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);

            const topReferrers = await Referral.aggregate([
                {
                    $match: {
                        joinedAt: { $gte: thisMonthStart },
                        status: 'active'
                    }
                },
                {
                    $group: {
                        _id: '$referrer',
                        referralCount: { $sum: 1 }
                    }
                },
                {
                    $sort: { referralCount: -1 }
                },
                {
                    $limit: limit
                },
                {
                    $lookup: {
                        from: 'users',
                        localField: '_id',
                        foreignField: '_id',
                        as: 'user'
                    }
                },
                {
                    $project: {
                        userId: '$_id',
                        referralCount: 1,
                        username: { $arrayElemAt: ['$user.username', 0] }
                    }
                }
            ]);

            return topReferrers;
        } catch (error) {
            logger.error('Get top referrers error', error);
            throw error;
        }
    }
};

module.exports = referralService;

