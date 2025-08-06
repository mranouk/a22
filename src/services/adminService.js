// src/services/adminService.js
const db = require('./db')
const config = require('../config/default.json') // or use environment/config management

/**
 * Return Telegram user IDs of all admins (from config or database).
 */
exports.getAdminUserIds = async () => {
  if (config.admins && Array.isArray(config.admins)) {
    return config.admins
  }
  // If storing admins in the DB:
  const admins = await db.User.find({ isAdmin: true })
  return admins.map(u => u.tgid)
}

/**
 * Log an approval action (for audit trail).
 * @param {Object} options { reqType, reqId, adminId, action, reason }
 */
exports.logApprovalAction = async ({ reqType, reqId, adminId, action, reason }) => {
  // Upsert to auditLog collection; for now, recording as log entry in RoleRequest
  const update = {
    $push: {
      logs: {
        at: new Date(),
        action: `${reqType}:${action}`,
        meta: {
          adminId,
          reqId,
          reason
        }
      }
    }
  }
  await db.RoleRequest.updateOne({ id: reqId }, update)
}

/**
 * Optionally: Find all pending requests by type.
 */
exports.getPendingRequests = async (type) => {
  return db.RoleRequest.find({ type, status: 'pending' }).populate('user')
}
