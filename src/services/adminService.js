// src/services/adminService.js
const mongoose = require('mongoose');
const User = require('../models/user');
const RoleRequest = require('../models/roleRequest');
const Listing = require('../models/listing');
const AuditLog = require('../models/auditLog');
const Wallet = require('../models/wallet');
const config = require('config');
const logger = require('../utils/logger');

const adminService = {
    // Get admin user IDs from config or database
    async getAdminUserIds() {
        try {
            const adminIds = config.get('admin.adminIds') || [];
            
            // Also check for users marked as admin in database
            const adminUsers = await User.find({ isAdmin: true }, 'tgid');
            const dbAdminIds = adminUsers.map(user => user.tgid.toString());
            
            // Combine and deduplicate
            const allAdminIds = [...new Set([...adminIds, ...dbAdminIds])];
            return allAdminIds;
        } catch (error) {
            logger.error('Get admin user IDs error', error);
            return [];
        }
    },

    // Check if user is admin
    async isAdmin(userId) {
        try {
            const adminIds = await this.getAdminUserIds();
            return adminIds.includes(userId.toString());
        } catch (error) {
            logger.error('Is admin check error', error);
            return false;
        }
    },

    // Get pending requests by type
    async getPendingRequests(type = null, limit = 50, offset = 0) {
        try {
            const query = { status: 'pending' };
            if (type) {
                query.type = type;
            }

            const total = await RoleRequest.countDocuments(query);
            const requests = await RoleRequest.find(query)
                .populate('user', 'username tgid firstName lastName')
                .sort({ createdAt: -1 })
                .skip(offset)
                .limit(limit);

            return {
                requests,
                total,
                hasMore: offset + limit < total
            };
        } catch (error) {
            logger.error('Get pending requests error', error);
            return { requests: [], total: 0, hasMore: false };
        }
    },

    // Get all requests with filtering
    async getAllRequests(filters = {}, limit = 50, offset = 0) {
        try {
            const query = {};
            
            if (filters.status) query.status = filters.status;
            if (filters.type) query.type = filters.type;
            if (filters.userId) query.user = filters.userId;
            if (filters.fromDate) query.createdAt = { $gte: new Date(filters.fromDate) };
            if (filters.toDate) {
                query.createdAt = { 
                    ...query.createdAt,
                    $lte: new Date(filters.toDate)
                };
            }

            const total = await RoleRequest.countDocuments(query);
            const requests = await RoleRequest.find(query)
                .populate('user', 'username tgid firstName lastName')
                .populate('approvedBy', 'username')
                .sort({ createdAt: -1 })
                .skip(offset)
                .limit(limit);

            return {
                requests,
                total,
                hasMore: offset + limit < total
            };
        } catch (error) {
            logger.error('Get all requests error', error);
            return { requests: [], total: 0, hasMore: false };
        }
    },

    // Approve a request
    async approveRequest(requestId, adminId, reason = '') {
        try {
            const request = await RoleRequest.findById(requestId).populate('user');
            if (!request) {
                return { success: false, message: 'Request not found' };
            }

            if (request.status !== 'pending') {
                return { success: false, message: 'Request already processed' };
            }

            // Update request status
            request.status = 'approved';
            request.approvedBy = adminId;
            request.approvedAt = new Date();
            request.reason = reason;

            // Apply the changes based on request type
            if (request.type === 'role_assignment') {
                await User.findByIdAndUpdate(request.user._id, {
                    role: request.requestedRole,
                    roleApprovedAt: new Date()
                });
            } else if (request.type === 'profile_update') {
                // Apply profile updates
                const updates = {};
                if (request.data.sector) updates.sector = request.data.sector;
                if (request.data.experience) updates.experience = request.data.experience;
                if (request.data.gender) updates.gender = request.data.gender;
                
                await User.findByIdAndUpdate(request.user._id, updates);
            }

            await request.save();

            // Log the approval
            await this.logAdminAction(adminId, 'approve_request', {
                requestId,
                requestType: request.type,
                userId: request.user._id,
                reason
            });

            return { success: true, request };
        } catch (error) {
            logger.error('Approve request error', error);
            return { success: false, message: 'Error approving request' };
        }
    },

    // Reject a request
    async rejectRequest(requestId, adminId, reason = '') {
        try {
            const request = await RoleRequest.findById(requestId).populate('user');
            if (!request) {
                return { success: false, message: 'Request not found' };
            }

            if (request.status !== 'pending') {
                return { success: false, message: 'Request already processed' };
            }

            // Update request status
            request.status = 'rejected';
            request.rejectedBy = adminId;
            request.rejectedAt = new Date();
            request.reason = reason;
            await request.save();

            // Log the rejection
            await this.logAdminAction(adminId, 'reject_request', {
                requestId,
                requestType: request.type,
                userId: request.user._id,
                reason
            });

            return { success: true, request };
        } catch (error) {
            logger.error('Reject request error', error);
            return { success: false, message: 'Error rejecting request' };
        }
    },

    // Get system statistics
    async getSystemStats() {
        try {
            const [
                totalUsers,
                activeUsers,
                totalListings,
                activeListings,
                totalTransactions,
                pendingRequests
            ] = await Promise.all([
                User.countDocuments(),
                User.countDocuments({ lastActiveAt: { $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) } }),
                Listing.countDocuments(),
                Listing.countDocuments({ isActive: true }),
                Wallet.aggregate([
                    { $unwind: '$transactions' },
                    { $count: 'total' }
                ]),
                RoleRequest.countDocuments({ status: 'pending' })
            ]);

            // Get revenue statistics
            const revenueStats = await Wallet.aggregate([
                { $unwind: '$transactions' },
                {
                    $match: {
                        'transactions.type': { $in: ['boost_purchase', 'premium_purchase'] },
                        'transactions.status': 'completed'
                    }
                },
                {
                    $group: {
                        _id: null,
                        totalRevenue: { $sum: '$transactions.amount' },
                        transactionCount: { $sum: 1 }
                    }
                }
            ]);

            // Get user role distribution
            const roleDistribution = await User.aggregate([
                {
                    $group: {
                        _id: '$role',
                        count: { $sum: 1 }
                    }
                }
            ]);

            return {
                users: {
                    total: totalUsers,
                    active: activeUsers,
                    inactive: totalUsers - activeUsers
                },
                listings: {
                    total: totalListings,
                    active: activeListings,
                    inactive: totalListings - activeListings
                },
                transactions: {
                    total: totalTransactions[0]?.total || 0
                },
                revenue: {
                    total: revenueStats[0]?.totalRevenue || 0,
                    transactions: revenueStats[0]?.transactionCount || 0
                },
                requests: {
                    pending: pendingRequests
                },
                roles: roleDistribution.reduce((acc, role) => {
                    acc[role._id || 'unassigned'] = role.count;
                    return acc;
                }, {})
            };
        } catch (error) {
            logger.error('Get system stats error', error);
            return {};
        }
    },

    // Get user management data
    async getUsersForManagement(filters = {}, limit = 50, offset = 0) {
        try {
            const query = {};
            
            if (filters.role) query.role = filters.role;
            if (filters.status) {
                if (filters.status === 'active') {
                    query.lastActiveAt = { $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) };
                } else if (filters.status === 'banned') {
                    query.isBanned = true;
                }
            }
            if (filters.search) {
                query.$or = [
                    { username: { $regex: filters.search, $options: 'i' } },
                    { firstName: { $regex: filters.search, $options: 'i' } },
                    { lastName: { $regex: filters.search, $options: 'i' } }
                ];
            }

            const total = await User.countDocuments(query);
            const users = await User.find(query)
                .select('username tgid firstName lastName role trustScore createdAt lastActiveAt isBanned')
                .sort({ createdAt: -1 })
                .skip(offset)
                .limit(limit);

            return {
                users,
                total,
                hasMore: offset + limit < total
            };
        } catch (error) {
            logger.error('Get users for management error', error);
            return { users: [], total: 0, hasMore: false };
        }
    },

    // Ban/Unban user
    async toggleUserBan(userId, adminId, reason = '', isBan = true) {
        try {
            const user = await User.findById(userId);
            if (!user) {
                return { success: false, message: 'User not found' };
            }

            user.isBanned = isBan;
            if (isBan) {
                user.bannedAt = new Date();
                user.banReason = reason;
            } else {
                user.bannedAt = null;
                user.banReason = null;
            }
            await user.save();

            // Log the action
            await this.logAdminAction(adminId, isBan ? 'ban_user' : 'unban_user', {
                userId,
                reason
            });

            return { success: true, user };
        } catch (error) {
            logger.error('Toggle user ban error', error);
            return { success: false, message: 'Error updating user status' };
        }
    },

    // Send broadcast message
    async sendBroadcastMessage(adminId, message, targetRole = null, targetUsers = null) {
        try {
            let recipients = [];

            if (targetUsers && targetUsers.length > 0) {
                // Send to specific users
                recipients = await User.find({ _id: { $in: targetUsers } }, 'tgid username');
            } else if (targetRole) {
                // Send to users with specific role
                recipients = await User.find({ role: targetRole }, 'tgid username');
            } else {
                // Send to all users
                recipients = await User.find({}, 'tgid username');
            }

            // Log the broadcast
            await this.logAdminAction(adminId, 'broadcast_message', {
                message: message.substring(0, 100), // Store first 100 chars
                targetRole,
                recipientCount: recipients.length
            });

            return {
                success: true,
                recipients: recipients.map(r => ({ tgid: r.tgid, username: r.username })),
                message
            };
        } catch (error) {
            logger.error('Send broadcast message error', error);
            return { success: false, message: 'Error preparing broadcast' };
        }
    },

    // Get audit logs
    async getAuditLogs(filters = {}, limit = 100, offset = 0) {
        try {
            const query = {};
            
            if (filters.adminId) query.adminId = filters.adminId;
            if (filters.action) query.action = filters.action;
            if (filters.fromDate) query.createdAt = { $gte: new Date(filters.fromDate) };
            if (filters.toDate) {
                query.createdAt = { 
                    ...query.createdAt,
                    $lte: new Date(filters.toDate)
                };
            }

            const total = await AuditLog.countDocuments(query);
            const logs = await AuditLog.find(query)
                .populate('adminId', 'username')
                .sort({ createdAt: -1 })
                .skip(offset)
                .limit(limit);

            return {
                logs,
                total,
                hasMore: offset + limit < total
            };
        } catch (error) {
            logger.error('Get audit logs error', error);
            return { logs: [], total: 0, hasMore: false };
        }
    },

    // Log admin action
    async logAdminAction(adminId, action, data = {}) {
        try {
            const auditLog = new AuditLog({
                adminId,
                action,
                data,
                ipAddress: data.ipAddress || null,
                createdAt: new Date()
            });

            await auditLog.save();
            
            // Also use the system logger
            logger.audit(action, adminId, data);
        } catch (error) {
            logger.error('Log admin action error', error);
        }
    },

    // Get moderation queue (reported content)
    async getModerationQueue(limit = 50, offset = 0) {
        try {
            // This would typically involve a reports collection
            // For now, return listings that might need review
            const suspiciousListings = await Listing.find({
                $or: [
                    { reportCount: { $gt: 0 } },
                    { isReported: true },
                    { needsReview: true }
                ]
            })
            .populate('creator', 'username tgid')
            .sort({ reportCount: -1, createdAt: -1 })
            .skip(offset)
            .limit(limit);

            return {
                items: suspiciousListings,
                total: suspiciousListings.length,
                hasMore: false // This would be calculated properly with a reports collection
            };
        } catch (error) {
            logger.error('Get moderation queue error', error);
            return { items: [], total: 0, hasMore: false };
        }
    },

    // Moderate content (approve/reject/remove)
    async moderateContent(contentId, contentType, action, adminId, reason = '') {
        try {
            let result = { success: false };

            if (contentType === 'listing') {
                const listing = await Listing.findById(contentId);
                if (!listing) {
                    return { success: false, message: 'Listing not found' };
                }

                switch (action) {
                    case 'approve':
                        listing.needsReview = false;
                        listing.isReported = false;
                        listing.moderatedBy = adminId;
                        listing.moderatedAt = new Date();
                        break;
                    case 'remove':
                        listing.isActive = false;
                        listing.removedBy = adminId;
                        listing.removedAt = new Date();
                        listing.removalReason = reason;
                        break;
                    case 'flag':
                        listing.isFlagged = true;
                        listing.flaggedBy = adminId;
                        listing.flaggedAt = new Date();
                        listing.flagReason = reason;
                        break;
                }

                await listing.save();
                result = { success: true, listing };
            }

            // Log the moderation action
            await this.logAdminAction(adminId, `moderate_${contentType}`, {
                contentId,
                action,
                reason
            });

            return result;
        } catch (error) {
            logger.error('Moderate content error', error);
            return { success: false, message: 'Error moderating content' };
        }
    }
};

module.exports = adminService;

