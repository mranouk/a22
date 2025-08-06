const db = require('./db')
const { RESTRICTED_PROFILE_FIELDS } = require('../utils/constants')
const { v4: uuidv4 } = require('uuid')

/**
 * Save or edit a user's profile. Returns { needsApproval: bool }.
 * If restricted fields are changed, creates a pending approval; otherwise saves immediately.
 * @param {number} userId
 * @param {object} profileData
 * @returns {Promise<{ needsApproval: boolean }>}
 */
exports.completeOrEditProfile = async (userId, profileData) => {
  // Fetch current profile if exists
  const currentProfile = await db.Profile.findOne({ user: userId })
  let needsApproval = false

  // If profile exists, check for restricted edits
  if (currentProfile) {
    let restrictedChanged = false
    RESTRICTED_PROFILE_FIELDS.forEach(fld => {
      if (
        Object.prototype.hasOwnProperty.call(profileData, fld) &&
        profileData[fld] !== currentProfile[fld]
      ) {
        restrictedChanged = true
      }
    })

    if (restrictedChanged) {
      // Create pending approval (store update & status = pending)
      const reqId = uuidv4()
      await db.RoleRequest.create({
        id: reqId,
        type: 'profile',
        user: userId,
        status: 'pending',
        payload: profileData,
        logs: [ { at: new Date(), action: 'requested-change' } ]
      })
      needsApproval = true
    } else {
      // Save changes directly
      await db.Profile.updateOne({ user: userId }, { $set: profileData })
    }
  } else {
    // First-time profile, just save
    await db.Profile.create({ user: userId, ...profileData })
  }

  return { needsApproval }
}

/**
 * Admin approves a pending profile change.
 * @returns {Promise<{ userId: number }>}
 */
exports.approveProfileChange = async (reqId, adminId) => {
  const req = await db.RoleRequest.findById(reqId)
  if (!req || req.status !== 'pending' || req.type !== 'profile') throw new Error('Invalid profile approval request')
  await db.Profile.updateOne({ user: req.user }, { $set: req.payload })
  await db.RoleRequest.updateOne({ id: reqId }, { $set: { status: 'approved', approvedBy: adminId, approvedAt: new Date() } })
  return { userId: req.user }
}

/**
 * Admin rejects a pending profile change.
 * @returns {Promise<{ userId: number }>}
 */
exports.rejectProfileChange = async (reqId, adminId) => {
  const req = await db.RoleRequest.findById(reqId)
  if (!req || req.status !== 'pending' || req.type !== 'profile') throw new Error('Invalid profile rejection request')
  await db.RoleRequest.updateOne({ id: reqId }, { $set: { status: 'rejected', approvedBy: adminId, approvedAt: new Date() } })
  return { userId: req.user }
}
