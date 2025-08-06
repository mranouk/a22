const db = require('./db')
const { v4: uuidv4 } = require('uuid')

/**
 * Ensure the user is onboarded: create if new, update username if changed.
 * @param {Number} tgid - Telegram user ID
 * @param {String} username - Current Telegram username
 */
exports.ensureOnboarded = async (tgid, username) => {
  let user = await db.User.findOne({ tgid })
  if (!user) {
    user = await db.User.create({ tgid, username })
  } else if (user.username !== username) {
    user.username = username
    await user.save()
  }
  return user
}

/**
 * Requests a role assignment for the user.
 * @param {Number} tgid - Telegram user ID
 * @param {String} roleKey
 */
exports.requestRole = async (tgid, roleKey) => {
  const user = await db.User.findOne({ tgid })
  if (!user) throw new Error('User not found')
  // Only allow if not already requested/pending/active (as per your business logic)
  // Create RoleRequest
  const reqId = uuidv4()
  await db.RoleRequest.create({
    id: reqId,
    type: 'role',
    user: user._id,
    status: 'pending',
    payload: { roleKey },
    logs: [ { at: new Date(), action: 'requested-role' } ]
  })
  return reqId
}

/**
 * Create a role request entry (similar for other request types).
 */
exports.createRoleRequest = async (userId, roleKey) => {
  const reqId = uuidv4()
  await db.RoleRequest.create({
    id: reqId,
    type: 'role',
    user: userId,
    status: 'pending',
    payload: { roleKey },
    logs: [ { at: new Date(), action: 'requested-role' } ]
  })
  return reqId
}

/**
 * Admin approves a role request.
 * Returns: { userId, roleKey }
 */
exports.approveRoleRequest = async (reqId, adminId) => {
  const req = await db.RoleRequest.findOne({ id: reqId, type: 'role', status: 'pending' })
  if (!req) throw new Error('Role request not found or already handled')
  // Assign role to user
  await db.User.updateOne({ _id: req.user }, { $set: { role: req.payload.roleKey } })
  await db.RoleRequest.updateOne({ id: reqId }, { $set: { status: 'approved', approvedBy: adminId, approvedAt: new Date() } })
  return {
    userId: req.user,
    roleKey: req.payload.roleKey
  }
}

/**
 * Admin rejects a role request.
 */
exports.rejectRoleRequest = async (reqId, adminId) => {
  const req = await db.RoleRequest.findOne({ id: reqId, type: 'role', status: 'pending' })
  if (!req) throw new Error('Role request not found or already handled')
  await db.RoleRequest.updateOne({ id: reqId }, { $set: { status: 'rejected', approvedBy: adminId, approvedAt: new Date() } })
  return { userId: req.user }
}

/**
 * Lookup user by Telegram user ID.
 */
exports.findByTgId = async (tgid) => {
  return db.User.findOne({ tgid })
}

/**
 * Add or link a referrer to a user (implements referral system, optional).
 */
exports.setReferrer = async (tgid, referrerTgId) => {
  const referrer = await db.User.findOne({ tgid: referrerTgId })
  if (!referrer) throw new Error('Referrer not found')
  await db.User.updateOne({ tgid }, { $set: { referrer: referrer._id } })
}
