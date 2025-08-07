// src/bot/handlers/approvalHandler.js
const { Markup } = require('telegraf')
const userService = require('../../services/userService')
const profileService = require('../../services/profileService')
const marketplaceService = require('../../services/marketplaceService')
const notificationService = require('../../services/notificationService')
const adminService = require('../../services/adminService')
const { ROLES } = require('../../utils/constants')

/**
 * Sends approval request to an admin (role/profile/listing).
 * Options must include adminId, userId, username, roleKey/roleLabel, or other relevant context.
 */
exports.sendRoleApprovalRequest = async ({ adminId, userId, username, roleKey, roleLabel }) => {
  const requestId = await userService.createRoleRequest(userId, roleKey)
  return notificationService.sendMessage(
    adminId,
    `<b>🗂️ Pending Role Approval</b>\n\nUser: <b>@${username}</b>\nRole: <b>${roleLabel}</b>\n\nApprove or Reject below:`,
    Markup.inlineKeyboard([
      [
        Markup.button.callback('✅ Approve', `APPROVE_REQ_role_${requestId}`),
        Markup.button.callback('❌ Reject', `REJECT_REQ_role_${requestId}`)
      ]
    ])
  )
}

/**
 * Approves a pending request (role/profile/listing), updates status, notifies user & logs action.
 */
exports.approveRequest = async ({ reqType, reqId, adminId }) => {
  let userId, label
  if (reqType === 'role') {
    ({ userId, roleKey: label } = await userService.approveRoleRequest(reqId, adminId))
    const role = ROLES.find(r => r.key === label)
    await notificationService.sendMessage(
      userId,
      `✅ <b>Congratulations!</b>\nYour role <b>${role.emoji} ${role.label}</b> is now approved.`
    )
  } else if (reqType === 'profile') {
    ({ userId } = await profileService.approveProfileChange(reqId, adminId))
    await notificationService.sendMessage(
      userId,
      '✅ <b>Your profile change is approved!</b>'
    )
  } else if (reqType === 'listing') {
    ({ userId } = await marketplaceService.approveListing(reqId, adminId))
    await notificationService.sendMessage(
      userId,
      '✅ <b>Your marketplace listing was approved!</b>'
    )
  }
  // Optionally log action via audit service
  await adminService.logApprovalAction({ reqType, reqId, adminId, action: 'approve' })
}

/**
 * Rejects a pending request (admin action), notifies user with optional reason.
 * If reason=null, generic message is sent.
 */
exports.rejectRequest = async ({ reqType, reqId, adminId, reason }) => {
  let userId
  if (reqType === 'role') {
    ({ userId } = await userService.rejectRoleRequest(reqId, adminId))
    let msg = '❌ <b>Your role request was rejected.</b>'
    if (reason) msg += `\nReason: <i>${reason}</i>`
    await notificationService.sendMessage(userId, msg)
  } else if (reqType === 'profile') {
    ({ userId } = await profileService.rejectProfileChange(reqId, adminId))
    let msg = '❌ <b>Your profile change was rejected.</b>'
    if (reason) msg += `\nReason: <i>${reason}</i>`
    await notificationService.sendMessage(userId, msg)
  } else if (reqType === 'listing') {
    ({ userId } = await marketplaceService.rejectListing(reqId, adminId))
    let msg = '❌ <b>Your marketplace listing was rejected.</b>'
    if (reason) msg += `\nReason: <i>${reason}</i>`
    await notificationService.sendMessage(userId, msg)
  }
  // Optionally log action via audit service
  await adminService.logApprovalAction({ reqType, reqId, adminId, action: 'reject', reason })
}

/**
 * Sends approval request to an admin for profile changes.
 * Options must include userId, username, and changes object.
 */
exports.sendProfileApprovalRequest = async ({ userId, username, changes }) => {
  // For demo, pick the first admin from config or env
  const adminId = process.env.ADMIN_ID || (Array.isArray(process.env.ADMINS) ? process.env.ADMINS[0] : null)
  if (!adminId) throw new Error('No admin configured for approvals')
  const requestId = await profileService.createProfileChangeRequest(userId, changes)
  return notificationService.sendMessage(
    adminId,
    `<b>📝 Pending Profile Change Approval</b>\n\nUser: <b>@${username}</b>\nRequested changes: <pre>${JSON.stringify(changes, null, 2)}</pre>\n\nApprove or Reject below:`,
    Markup.inlineKeyboard([
      [
        Markup.button.callback('✅ Approve', `APPROVE_REQ_profile_${requestId}`),
        Markup.button.callback('❌ Reject', `REJECT_REQ_profile_${requestId}`)
      ]
    ])
  )
}
