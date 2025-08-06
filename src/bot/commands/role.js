const { Markup } = require('telegraf')
const userService = require('../../services/userService')
const adminService = require('../../services/adminService')
const approvalHandler = require('../handlers/approvalHandler')
const { ROLES } = require('../../utils/constants')

/**
 * Role selection callback handler (ROLE_SELECT_{roleKey}).
 */
module.exports = async (ctx) => {
  try {
    // Find which role was selected via callback data
    const data = ctx.callbackQuery.data
    const roleKey = data.replace('ROLE_SELECT_', '')
    const role = ROLES.find(r => r.key === roleKey)
    if (!role) {
      return ctx.answerCbQuery('⛔️ Invalid role, try again!', { show_alert: true })
    }

    const userId = ctx.from.id
    await userService.requestRole(userId, roleKey)

    // Show user "waiting for approval" with emoji/status
    await ctx.editMessageText(
      `⏳ <b>Waiting for approval!</b>\n\nYour <b>${role.emoji} ${role.label}</b> role request was sent for admin review.\nYou'll be notified once approved.`,
      { parse_mode: 'HTML' }
    )

    // Notify ALL admins: pending role approval
    const admins = await adminService.getAdminUserIds()
    for (const adminId of admins) {
      await approvalHandler.sendRoleApprovalRequest({
        adminId,
        userId,
        username: ctx.from.username,
        roleKey,
        roleLabel: `${role.emoji} ${role.label}`,
      })
    }

    return ctx.answerCbQuery('Sent for approval!', { show_alert: false })
  } catch (err) {
    console.error('ROLE_ERR', err)
    await ctx.replyWithHTML('⚠️ <b>Error processing role selection.</b>\nPlease try again later!')
  }
}
