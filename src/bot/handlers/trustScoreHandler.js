const trustScoreService = require('../../services/trustScoreService');
const userService = require('../../services/userService');
const notificationService = require('../../services/notificationService');
const logger = require('../../utils/logger');

const trustScoreHandler = {
    // Update trust score after a transaction
    async updateTrustScoreAfterTransaction(userId, transactionType, transactionAmount, outcome) {
        try {
            const user = await userService.findById(userId);
            if (!user) {
                logger.warn(`User not found for trust score update: ${userId}`);
                return { success: false, message: 'User not found' };
            }

            let scoreChange = 0;
            let reason = '';

            // Calculate score change based on transaction type and outcome
            switch (transactionType) {
                case 'marketplace_purchase':
                    if (outcome === 'completed') {
                        scoreChange = Math.min(5, Math.floor(transactionAmount / 20)); // +1 per $20, max +5
                        reason = 'Successful marketplace purchase';
                    } else if (outcome === 'disputed') {
                        scoreChange = -3;
                        reason = 'Disputed marketplace purchase';
                    }
                    break;

                case 'marketplace_sale':
                    if (outcome === 'completed') {
                        scoreChange = Math.min(10, Math.floor(transactionAmount / 10)); // +1 per $10, max +10
                        reason = 'Successful marketplace sale';
                    } else if (outcome === 'disputed') {
                        scoreChange = -5;
                        reason = 'Disputed marketplace sale';
                    }
                    break;

                case 'escrow_release':
                    if (outcome === 'completed') {
                        scoreChange = 2;
                        reason = 'Successful escrow completion';
                    }
                    break;

                case 'listing_creation':
                    scoreChange = 1;
                    reason = 'Created marketplace listing';
                    break;

                case 'profile_completion':
                    scoreChange = 10;
                    reason = 'Completed profile information';
                    break;

                case 'referral_success':
                    scoreChange = 5;
                    reason = 'Successful referral';
                    break;

                default:
                    logger.warn(`Unknown transaction type for trust score: ${transactionType}`);
                    return { success: false, message: 'Unknown transaction type' };
            }

            if (scoreChange === 0) {
                return { success: true, message: 'No score change required' };
            }

            // Apply the score change
            const result = await trustScoreService.updateTrustScore(userId, scoreChange, reason);
            
            if (!result.success) {
                return result;
            }

            // Check for badge level changes
            const badgeUpdate = await this.checkBadgeLevelUpdate(userId, result.newScore);

            // Send notification if score changed significantly or badge leveled up
            if (Math.abs(scoreChange) >= 5 || badgeUpdate.leveledUp) {
                await this.sendTrustScoreNotification(userId, scoreChange, result.newScore, badgeUpdate);
            }

            logger.audit('trust_score_updated', userId, {
                transactionType,
                outcome,
                scoreChange,
                newScore: result.newScore,
                reason
            });

            return {
                success: true,
                scoreChange,
                newScore: result.newScore,
                badgeUpdate
            };

        } catch (error) {
            logger.error('Update trust score after transaction error', error, {
                userId,
                transactionType,
                outcome
            });
            return { success: false, message: 'Error updating trust score' };
        }
    },

    // Check and update badge level based on trust score
    async checkBadgeLevelUpdate(userId, currentScore) {
        try {
            const user = await userService.findById(userId);
            if (!user) {
                return { leveledUp: false };
            }

            // Define badge thresholds
            const badgeLevels = [
                { name: 'Bronze', threshold: 100, emoji: '🥉' },
                { name: 'Silver', threshold: 300, emoji: '🥈' },
                { name: 'Gold', threshold: 600, emoji: '🥇' },
                { name: 'Platinum', threshold: 900, emoji: '💎' },
                { name: 'Diamond', threshold: 1200, emoji: '💠' }
            ];

            // Find current and new badge levels
            const currentBadge = user.badgeLevel || 'None';
            let newBadge = 'None';

            for (const badge of badgeLevels.reverse()) {
                if (currentScore >= badge.threshold) {
                    newBadge = badge.name;
                    break;
                }
            }

            // Check if user leveled up
            const leveledUp = newBadge !== currentBadge && newBadge !== 'None';

            if (leveledUp) {
                // Update user's badge level
                await userService.updateUser(userId, { badgeLevel: newBadge });

                logger.audit('badge_level_up', userId, {
                    previousBadge: currentBadge,
                    newBadge,
                    trustScore: currentScore
                });
            }

            return {
                leveledUp,
                previousBadge: currentBadge,
                newBadge,
                badgeEmoji: badgeLevels.find(b => b.name === newBadge)?.emoji || ''
            };

        } catch (error) {
            logger.error('Check badge level update error', error, { userId, currentScore });
            return { leveledUp: false };
        }
    },

    // Send trust score notification
    async sendTrustScoreNotification(userId, scoreChange, newScore, badgeUpdate) {
        try {
            let title, message;

            if (badgeUpdate.leveledUp) {
                title = '🎉 Badge Level Up!';
                message = `Congratulations! You've reached ${badgeUpdate.newBadge} level! ${badgeUpdate.badgeEmoji}\n\nYour trust score is now ${newScore}.`;
            } else if (scoreChange > 0) {
                title = '📈 Trust Score Increased!';
                message = `Great job! Your trust score increased by +${scoreChange} points.\n\nNew score: ${newScore}`;
            } else {
                title = '📉 Trust Score Decreased';
                message = `Your trust score decreased by ${scoreChange} points.\n\nCurrent score: ${newScore}\n\nMaintain good marketplace behavior to improve your score.`;
            }

            await notificationService.sendNotification(userId, {
                type: badgeUpdate.leveledUp ? 'badge_level_up' : 'trust_score_change',
                title,
                message,
                data: {
                    scoreChange,
                    newScore,
                    badgeLevel: badgeUpdate.newBadge || 'None'
                }
            });

        } catch (error) {
            logger.error('Send trust score notification error', error, { userId });
        }
    },

    // Handle user behavior incidents
    async handleBehaviorIncident(userId, incidentType, severity, description) {
        try {
            let scoreChange = 0;
            let reason = '';

            // Define score penalties based on incident type and severity
            const penaltyMatrix = {
                'spam': { low: -5, medium: -10, high: -20 },
                'fraud': { low: -20, medium: -50, high: -100 },
                'harassment': { low: -10, medium: -25, high: -50 },
                'fake_listing': { low: -15, medium: -30, high: -60 },
                'payment_default': { low: -10, medium: -20, high: -40 },
                'terms_violation': { low: -5, medium: -15, high: -30 }
            };

            if (penaltyMatrix[incidentType] && penaltyMatrix[incidentType][severity]) {
                scoreChange = penaltyMatrix[incidentType][severity];
                reason = `${severity.charAt(0).toUpperCase() + severity.slice(1)} ${incidentType.replace('_', ' ')} incident`;
            } else {
                logger.warn(`Unknown incident type or severity: ${incidentType}, ${severity}`);
                return { success: false, message: 'Unknown incident type or severity' };
            }

            // Apply the penalty
            const result = await trustScoreService.updateTrustScore(userId, scoreChange, reason);
            
            if (!result.success) {
                return result;
            }

            // Send warning notification
            await notificationService.sendNotification(userId, {
                type: 'behavior_warning',
                title: '⚠️ Trust Score Penalty',
                message: `Your trust score was reduced by ${Math.abs(scoreChange)} points due to: ${description}\n\nCurrent score: ${result.newScore}\n\nPlease follow community guidelines to maintain your standing.`,
                data: {
                    incidentType,
                    severity,
                    scoreChange,
                    newScore: result.newScore
                }
            });

            // Check if user should be restricted
            if (result.newScore < 20) {
                await this.handleLowTrustScore(userId, result.newScore);
            }

            logger.audit('behavior_incident', userId, {
                incidentType,
                severity,
                description,
                scoreChange,
                newScore: result.newScore
            });

            return {
                success: true,
                scoreChange,
                newScore: result.newScore
            };

        } catch (error) {
            logger.error('Handle behavior incident error', error, {
                userId,
                incidentType,
                severity
            });
            return { success: false, message: 'Error handling behavior incident' };
        }
    },

    // Handle low trust score restrictions
    async handleLowTrustScore(userId, trustScore) {
        try {
            let restrictions = [];

            if (trustScore < 20) {
                restrictions = [
                    'listing_creation_disabled',
                    'escrow_participation_limited',
                    'boost_purchases_disabled'
                ];
            } else if (trustScore < 50) {
                restrictions = [
                    'listing_creation_limited',
                    'high_value_transactions_limited'
                ];
            }

            if (restrictions.length > 0) {
                // Apply restrictions (implementation would depend on specific business logic)
                await userService.updateUser(userId, { 
                    restrictions,
                    restrictionReason: `Low trust score: ${trustScore}`
                });

                // Send notification about restrictions
                await notificationService.sendNotification(userId, {
                    type: 'account_restricted',
                    title: '🚫 Account Restrictions Applied',
                    message: `Due to your low trust score (${trustScore}), some features have been restricted.\n\nImprove your score by completing successful transactions and following community guidelines.`,
                    data: { trustScore, restrictions }
                });

                logger.audit('trust_restrictions_applied', userId, {
                    trustScore,
                    restrictions
                });
            }

        } catch (error) {
            logger.error('Handle low trust score error', error, { userId, trustScore });
        }
    },

    // Calculate trust score trend
    async calculateTrustScoreTrend(userId, days = 30) {
        try {
            const history = await trustScoreService.getTrustScoreHistory(userId, days);
            
            if (history.length < 2) {
                return { trend: 'stable', change: 0 };
            }

            const firstScore = history[0].score;
            const lastScore = history[history.length - 1].score;
            const change = lastScore - firstScore;

            let trend = 'stable';
            if (change > 10) {
                trend = 'rising';
            } else if (change < -10) {
                trend = 'declining';
            }

            return { trend, change, history };

        } catch (error) {
            logger.error('Calculate trust score trend error', error, { userId });
            return { trend: 'unknown', change: 0 };
        }
    },

    // Generate trust score report
    async generateTrustScoreReport(userId) {
        try {
            const user = await userService.findById(userId);
            if (!user) {
                return { success: false, message: 'User not found' };
            }

            const history = await trustScoreService.getTrustScoreHistory(userId, 90);
            const trend = await this.calculateTrustScoreTrend(userId);
            
            // Calculate statistics
            const stats = {
                currentScore: user.trustScore || 100,
                badgeLevel: user.badgeLevel || 'None',
                totalChanges: history.length,
                averageChange: history.length > 0 ? 
                    history.reduce((sum, h) => sum + h.change, 0) / history.length : 0,
                positiveChanges: history.filter(h => h.change > 0).length,
                negativeChanges: history.filter(h => h.change < 0).length,
                trend: trend.trend,
                trendChange: trend.change
            };

            return {
                success: true,
                stats,
                history: history.slice(-10), // Last 10 changes
                recommendations: this.generateTrustScoreRecommendations(stats)
            };

        } catch (error) {
            logger.error('Generate trust score report error', error, { userId });
            return { success: false, message: 'Error generating report' };
        }
    },

    // Generate recommendations for improving trust score
    generateTrustScoreRecommendations(stats) {
        const recommendations = [];

        if (stats.currentScore < 100) {
            recommendations.push('Complete your profile information (+10 points)');
        }

        if (stats.currentScore < 200) {
            recommendations.push('Make successful marketplace purchases');
            recommendations.push('Complete transactions without disputes');
        }

        if (stats.currentScore < 400) {
            recommendations.push('Create quality marketplace listings');
            recommendations.push('Maintain good seller ratings');
        }

        if (stats.negativeChanges > stats.positiveChanges) {
            recommendations.push('Focus on following community guidelines');
            recommendations.push('Resolve any pending disputes');
        }

        if (recommendations.length === 0) {
            recommendations.push('Keep up the excellent marketplace behavior!');
            recommendations.push('Consider helping other users to earn bonus points');
        }

        return recommendations;
    }
};

module.exports = trustScoreHandler;
