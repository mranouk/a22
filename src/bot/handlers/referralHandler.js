const referralService = require('../../services/referralService');
const userService = require('../../services/userService');
const walletService = require('../../services/walletService');
const notificationService = require('../../services/notificationService');
const { formatCurrency } = require('../../utils/helpers');
const logger = require('../../utils/logger');

const referralHandler = {
    // Process new user referral
    async processNewUserReferral(referredUserId, referralCode) {
        try {
            if (!referralCode) {
                return { success: false, message: 'No referral code provided' };
            }

            // Find the referrer by referral code
            const referrer = await userService.findByReferralCode(referralCode);
            if (!referrer) {
                logger.warn(`Invalid referral code used: ${referralCode}`);
                return { success: false, message: 'Invalid referral code' };
            }

            // Don't allow self-referral
            if (referrer.id === referredUserId) {
                return { success: false, message: 'Cannot refer yourself' };
            }

            // Check if user was already referred
            const existingReferral = await referralService.findReferral(referredUserId);
            if (existingReferral) {
                return { success: false, message: 'User already referred' };
            }

            // Create referral record
            const referral = await referralService.createReferral({
                referrerId: referrer.id,
                referredUserId: referredUserId,
                referralCode: referralCode,
                status: 'pending',
                createdAt: new Date()
            });

            // Award registration bonus to referrer
            const registrationBonus = 10; // $10 for new user registration
            await this.awardReferralBonus(
                referrer.id,
                registrationBonus,
                'registration_bonus',
                `New user registration bonus - ${referredUserId}`
            );

            // Send notifications
            await Promise.all([
                notificationService.sendNotification(referrer.id, {
                    type: 'referral_success',
                    title: '🎉 New Referral!',
                    message: `Someone joined using your referral code! You earned ${formatCurrency(registrationBonus)}.`,
                    data: { referredUserId, bonus: registrationBonus }
                }),
                notificationService.sendNotification(referredUserId, {
                    type: 'welcome_referred',
                    title: '👋 Welcome!',
                    message: `You were referred by ${referrer.username || 'someone'}. Enjoy the marketplace!`,
                    data: { referrerId: referrer.id }
                })
            ]);

            logger.audit('referral_processed', referrer.id, {
                referredUserId,
                referralCode,
                bonus: registrationBonus
            });

            return { 
                success: true, 
                referrerId: referrer.id,
                bonus: registrationBonus,
                referralId: referral.id
            };

        } catch (error) {
            logger.error('Process new user referral error', error, { referredUserId, referralCode });
            return { success: false, message: 'Error processing referral' };
        }
    },

    // Process first purchase bonus
    async processFirstPurchaseBonus(userId, purchaseAmount) {
        try {
            // Find if user was referred
            const referral = await referralService.findReferral(userId);
            if (!referral) {
                return { success: false, message: 'User was not referred' };
            }

            // Check if first purchase bonus already awarded
            if (referral.firstPurchaseBonusAwarded) {
                return { success: false, message: 'First purchase bonus already awarded' };
            }

            // Award first purchase bonus
            const firstPurchaseBonus = 5; // $5 for first purchase
            await this.awardReferralBonus(
                referral.referrerId,
                firstPurchaseBonus,
                'first_purchase_bonus',
                `First purchase bonus - ${formatCurrency(purchaseAmount)}`
            );

            // Update referral record
            await referralService.updateReferral(referral.id, {
                firstPurchaseBonusAwarded: true,
                firstPurchaseAmount: purchaseAmount,
                firstPurchaseDate: new Date()
            });

            // Send notification to referrer
            await notificationService.sendNotification(referral.referrerId, {
                type: 'first_purchase_bonus',
                title: '💰 First Purchase Bonus!',
                message: `Your referral made their first purchase! You earned ${formatCurrency(firstPurchaseBonus)}.`,
                data: { 
                    referredUserId: userId, 
                    purchaseAmount,
                    bonus: firstPurchaseBonus 
                }
            });

            logger.audit('first_purchase_bonus', referral.referrerId, {
                referredUserId: userId,
                purchaseAmount,
                bonus: firstPurchaseBonus
            });

            return { 
                success: true, 
                referrerId: referral.referrerId,
                bonus: firstPurchaseBonus
            };

        } catch (error) {
            logger.error('Process first purchase bonus error', error, { userId, purchaseAmount });
            return { success: false, message: 'Error processing first purchase bonus' };
        }
    },

    // Process transaction commission
    async processTransactionCommission(userId, transactionAmount) {
        try {
            // Find if user was referred
            const referral = await referralService.findReferral(userId);
            if (!referral) {
                return { success: false, message: 'User was not referred' };
            }

            // Calculate commission (2% of transaction)
            const commissionRate = 0.02;
            const commission = transactionAmount * commissionRate;

            // Minimum commission threshold
            if (commission < 0.10) {
                return { success: false, message: 'Commission below minimum threshold' };
            }

            // Award commission
            await this.awardReferralBonus(
                referral.referrerId,
                commission,
                'transaction_commission',
                `Transaction commission - ${formatCurrency(transactionAmount)}`
            );

            // Update referral stats
            await referralService.updateReferralStats(referral.id, {
                totalCommissions: commission,
                totalTransactionVolume: transactionAmount
            });

            // Send notification to referrer (only for significant amounts)
            if (commission >= 1.00) {
                await notificationService.sendNotification(referral.referrerId, {
                    type: 'commission_earned',
                    title: '💎 Commission Earned!',
                    message: `You earned ${formatCurrency(commission)} commission from your referral's transaction.`,
                    data: { 
                        referredUserId: userId, 
                        transactionAmount,
                        commission
                    }
                });
            }

            logger.audit('transaction_commission', referral.referrerId, {
                referredUserId: userId,
                transactionAmount,
                commission
            });

            return { 
                success: true, 
                referrerId: referral.referrerId,
                commission
            };

        } catch (error) {
            logger.error('Process transaction commission error', error, { userId, transactionAmount });
            return { success: false, message: 'Error processing commission' };
        }
    },

    // Award referral bonus to user's wallet
    async awardReferralBonus(userId, amount, type, description) {
        try {
            // Add to wallet balance
            const wallet = await walletService.getOrCreateWallet(userId);
            wallet.balance += amount;

            // Add transaction record
            wallet.transactions.push({
                id: require('uuid').v4(),
                type: 'referral_bonus',
                amount: amount,
                currency: 'USD',
                status: 'completed',
                description: description,
                metadata: { bonusType: type },
                createdAt: new Date()
            });

            await wallet.save();

            // Update referral service records
            await referralService.recordBonus(userId, amount, type, description);

            logger.info(`Referral bonus awarded: ${formatCurrency(amount)}`, {
                userId,
                amount,
                type,
                description
            });

            return { success: true, amount };

        } catch (error) {
            logger.error('Award referral bonus error', error, { userId, amount, type });
            throw error;
        }
    },

    // Process monthly bonus for top referrers
    async processMonthlyBonuses() {
        try {
            const topReferrers = await referralService.getTopReferrers(10); // Top 10
            const bonuses = [100, 75, 50, 30, 20, 15, 10, 10, 5, 5]; // Tiered bonuses

            for (let i = 0; i < topReferrers.length && i < bonuses.length; i++) {
                const referrer = topReferrers[i];
                const bonus = bonuses[i];

                await this.awardReferralBonus(
                    referrer.userId,
                    bonus,
                    'monthly_bonus',
                    `Monthly top referrer bonus - Rank #${i + 1}`
                );

                await notificationService.sendNotification(referrer.userId, {
                    type: 'monthly_bonus',
                    title: '🏆 Monthly Bonus!',
                    message: `Congratulations! You ranked #${i + 1} in referrals this month and earned ${formatCurrency(bonus)}!`,
                    data: { rank: i + 1, bonus, referralCount: referrer.referralCount }
                });
            }

            logger.info(`Monthly bonuses processed for ${topReferrers.length} referrers`);

        } catch (error) {
            logger.error('Process monthly bonuses error', error);
        }
    },

    // Activate referral (when user completes profile)
    async activateReferral(userId) {
        try {
            const referral = await referralService.findReferral(userId);
            if (!referral) {
                return { success: false, message: 'No referral found' };
            }

            if (referral.status === 'active') {
                return { success: false, message: 'Referral already active' };
            }

            // Activate the referral
            await referralService.updateReferral(referral.id, {
                status: 'active',
                activatedAt: new Date()
            });

            // Send notification to referrer
            await notificationService.sendNotification(referral.referrerId, {
                type: 'referral_activated',
                title: '✅ Referral Activated!',
                message: 'Your referral completed their profile and is now active in the marketplace!',
                data: { referredUserId: userId }
            });

            logger.audit('referral_activated', referral.referrerId, {
                referredUserId: userId,
                referralId: referral.id
            });

            return { success: true, referralId: referral.id };

        } catch (error) {
            logger.error('Activate referral error', error, { userId });
            return { success: false, message: 'Error activating referral' };
        }
    },

    // Handle referral link generation
    async generateReferralLink(userId) {
        try {
            const user = await userService.findById(userId);
            if (!user) {
                throw new Error('User not found');
            }

            // Generate referral code if not exists
            if (!user.referralCode) {
                const updatedUser = await userService.generateReferralCode(userId);
                user.referralCode = updatedUser.referralCode;
            }

            const botUsername = process.env.BOT_USERNAME || 'marketplace_bot';
            const referralLink = `https://t.me/${botUsername}?start=${user.referralCode}`;

            return {
                success: true,
                referralCode: user.referralCode,
                referralLink
            };

        } catch (error) {
            logger.error('Generate referral link error', error, { userId });
            return { success: false, message: 'Error generating referral link' };
        }
    },

    // Validate referral eligibility
    validateReferralEligibility(referrer, referred) {
        try {
            // Check if referrer account is old enough (prevent abuse)
            const minAccountAge = 7 * 24 * 60 * 60 * 1000; // 7 days
            const accountAge = Date.now() - new Date(referrer.createdAt).getTime();
            
            if (accountAge < minAccountAge) {
                return { valid: false, reason: 'Referrer account too new' };
            }

            // Check referrer trust score
            if (referrer.trustScore < 50) {
                return { valid: false, reason: 'Referrer trust score too low' };
            }

            // Check for suspicious patterns (same IP, device, etc.)
            // This would require additional data collection

            return { valid: true };

        } catch (error) {
            logger.error('Validate referral eligibility error', error);
            return { valid: false, reason: 'Validation error' };
        }
    }
};

module.exports = referralHandler;
