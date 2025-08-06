// src/bot/handlers/roleSelectHandler.js
const userService = require('../../services/userService')
const db = require('../../services/db')
const { ROLES } = require('../../utils/constants')
const notificationService = require('../../services/notificationService')
const adminService = require('../../services/adminService')

module.exports = async (ctx) => {
  try {
    const data = ctx.callbackQuery?.data
    if (!data || !data.startsWith('ROLE_SELECT_')) {
      return ctx.answerCbQuery('Invalid role selection!')
    }

    const userId = ctx.from.id
    const username = ctx.from.username
    const roleKey = data.replace('ROLE_SELECT_', '')

    const role = ROLES.find(r => r.key === roleKey)
    if (!role) {
      return ctx.answerCbQuery('Unknown role!')
    }

    // Ensure user record exists, create if not
    let user = await db.User.findOne({ tgid: userId })
    if (!user) user = await userService.ensureOnboarded(userId, username)

    // Check if user has a pending or approved role request
    const existingReq = await db.RoleRequest.findOne({ user: user._id, type: 'role', status: { $in: ['pending', 'approved'] } })
    if (existingReq) {
      return ctx.replyWithHTML(`⏳ <b>Your role request is already ${existingReq.status}!</b>`)
    }

    // Create pending role request for admin approval
    const reqId = await userService.createRoleRequest(user._id, roleKey)

    await ctx.replyWithHTML(
      `✅ <b>Role selected:</b> ${role.emoji} <b>${role.label}</b>\n\n` +
      `Your request has been sent for admin approval.\n` +
      `<i>You will be notified when it is approved!</i>`
    )

    // Notify all admins
    const adminTgIds = await adminService.getAdminUserIds()
    await notificationService.broadcast(
      adminTgIds,
      `👤 <b>New Role Request!</b>\nUser: @${username || userId}\nRole: ${role.emoji} <b>${role.label}</b>\n\nApprove or reject in dashboard.`
    )
  } catch (err) {
    console.error('ROLE_SELECT_ERR', err)
    return ctx.replyWithHTML('⛔️ <b>Failed to submit role request.</b>\nPlease try again later.')
  }
}
